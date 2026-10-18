package com.orbitly.analytics;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.orbitly.analytics.AnalyticsDtos.ActivityItem;
import com.orbitly.analytics.AnalyticsDtos.ActivityPoint;
import com.orbitly.analytics.AnalyticsDtos.AdminOverview;
import com.orbitly.analytics.AnalyticsDtos.AtRiskLearner;
import com.orbitly.analytics.AnalyticsDtos.CourseStat;
import com.orbitly.analytics.AnalyticsDtos.InstructorOverview;
import com.orbitly.analytics.AnalyticsDtos.Metric;
import com.orbitly.analytics.AnalyticsDtos.Range;
import com.orbitly.analytics.AnalyticsDtos.SeatUsage;
import com.orbitly.analytics.AnalyticsDtos.SeriesPoint;
import com.orbitly.catalog.CourseCatalog;
import com.orbitly.common.security.CurrentUser;
import com.orbitly.common.security.Role;
import com.orbitly.common.web.ApiException;
import com.orbitly.learning.Enrollments;

/**
 * Read-only reporting over the other modules' tables. Plain SQL keeps the aggregations in the database.
 */
@Service
class AnalyticsService {

	/** Learners below this progress who haven't been active for {@link #RISK_IDLE} are "at risk". */
	static final int RISK_PROGRESS = 50;

	static final Duration RISK_IDLE = Duration.ofDays(14);

	private static final String PROGRESS = """
			(select count(*) from lesson_progress p join lessons l on l.id = p.lesson_id
			 where p.user_id = e.user_id and p.course_id = e.course_id and p.completed_at is not null)""";

	private static final String PERCENT = "least(100, round(" + PROGRESS
			+ " * 100.0 / nullif(c.lesson_count, 0)))";

	private final JdbcClient jdbc;

	private final CourseCatalog catalog;

	private final Clock clock;

	AnalyticsService(JdbcClient jdbc, CourseCatalog catalog, Clock clock) {
		this.jdbc = jdbc;
		this.catalog = catalog;
		this.clock = clock;
	}

	// ---- Admin ----------------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	AdminOverview adminOverview(CurrentUser admin, Range range) {
		UUID org = admin.orgId();
		Instant now = clock.instant();
		List<Instant[]> buckets = buckets(range, now);
		Instant since = buckets.get(0)[0];
		Instant before = since.minus(Duration.between(since, now));

		long active = activeLearners(org, since, now);
		long activePrev = activeLearners(org, before, since);

		long live = jdbc.sql("select count(*) from courses where org_id = ? and status = 'PUBLISHED'")
			.params(org).query(Long.class).single();
		long newlyLive = jdbc.sql("select count(*) from courses where org_id = ? and status = 'PUBLISHED' and published_at >= ?")
			.params(org, ts(since)).query(Long.class).single();

		double rateNow = completionRate(org, now);
		double rateThen = completionRate(org, since);

		long seatsUsed = jdbc.sql("select count(*) from memberships where org_id = ? and status = 'ACTIVE'")
			.params(org).query(Long.class).single();
		Integer seatLimit = jdbc.sql("select seat_limit from organizations where id = ?")
			.params(org).query(Integer.class).optional().orElse(null);
		Integer seatPercent = seatLimit == null || seatLimit == 0 ? null : (int) Math.round(seatsUsed * 100.0 / seatLimit);

		List<SeriesPoint> series = new ArrayList<>();
		for (Instant[] b : buckets) {
			long enrolled = jdbc.sql("select count(*) from enrollments where org_id = ? and created_at >= ? and created_at < ?")
				.params(org, ts(b[0]), ts(b[1])).query(Long.class).single();
			long completed = jdbc.sql("select count(*) from enrollments where org_id = ? and completed_at >= ? and completed_at < ?")
				.params(org, ts(b[0]), ts(b[1])).query(Long.class).single();
			series.add(new SeriesPoint(label(range, b[0]), b[0], enrolled, completed));
		}

		List<ActivityItem> feed = new ArrayList<>();
		if (seatPercent != null && seatPercent >= 90) {
			feed.add(new ActivityItem("SEAT_ALERT", "Seat usage reached " + seatPercent + "%", null, now));
		}
		feed.addAll(recentActivity(org, 10));

		return new AdminOverview(range, new Metric(active, delta(active, activePrev)), new Metric(live, (double) newlyLive),
				new Metric(round1(rateNow), round1(rateNow - rateThen)), new SeatUsage(seatsUsed, seatLimit, seatPercent),
				series, feed);
	}

	/** One row per course, for the admin's "Report" download. */
	@Transactional(readOnly = true)
	String reportCsv(CurrentUser admin) {
		var rows = jdbc.sql("""
				select c.title, c.status, u.full_name as instructor, c.enrollment_count,
				       (select count(*) from enrollments e where e.course_id = c.id and e.status = 'COMPLETED') as completed,
				       c.rating_avg, c.rating_count, c.currency,
				       (select coalesce(sum(o.amount_cents), 0) from orders o where o.course_id = c.id and o.status = 'PAID') as revenue
				from courses c join users u on u.id = c.instructor_id
				where c.org_id = ? order by c.enrollment_count desc, c.title""")
			.params(admin.orgId())
			.query((rs, i) -> {
				long learners = rs.getLong("enrollment_count");
				long completed = rs.getLong("completed");
				String rate = learners == 0 ? "" : String.valueOf(Math.round(completed * 100.0 / learners));
				return String.join(",", csv(rs.getString("title")), rs.getString("status"), csv(rs.getString("instructor")),
						String.valueOf(learners), String.valueOf(completed), rate, rs.getBigDecimal("rating_avg").toPlainString(),
						String.valueOf(rs.getInt("rating_count")), rs.getString("currency"),
						BigDecimal.valueOf(rs.getLong("revenue"), 2).toPlainString());
			})
			.list();
		return "Course,Status,Instructor,Learners,Completed,Completion %,Rating,Reviews,Currency,Revenue\n"
				+ String.join("\n", rows) + "\n";
	}

	// ---- Instructor -----------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	InstructorOverview instructorOverview(CurrentUser me) {
		UUID org = me.orgId();
		// Admins see every course; instructors see the ones they teach.
		UUID instructor = me.is(Role.ADMIN) ? null : me.userId();
		Instant now = clock.instant();
		String mine = "c.org_id = :org and (cast(:instructor as uuid) is null or c.instructor_id = :instructor)";

		long learners = jdbc.sql("select count(distinct e.user_id) from enrollments e join courses c on c.id = e.course_id where " + mine)
			.param("org", org).param("instructor", instructor).query(Long.class).single();
		long newLearners = jdbc.sql("select count(distinct e.user_id) from enrollments e join courses c on c.id = e.course_id where "
				+ mine + " and e.created_at >= :since")
			.param("org", org).param("instructor", instructor).param("since", ts(now.minus(Duration.ofDays(90))))
			.query(Long.class).single();
		Double avg = jdbc.sql("select avg(" + PERCENT + ") from enrollments e join courses c on c.id = e.course_id where " + mine)
			.param("org", org).param("instructor", instructor).query(Double.class).optional().orElse(null);

		var grading = jdbc.sql("select count(*) as n, min(s.submitted_at) as oldest from submissions s join courses c on c.id = s.course_id "
				+ "where " + mine + " and s.status = 'SUBMITTED'")
			.param("org", org).param("instructor", instructor)
			.query((rs, i) -> new Object[] { rs.getLong("n"), rs.getTimestamp("oldest") })
			.single();

		var rating = jdbc.sql("select coalesce(sum(c.rating_avg * c.rating_count), 0) as total, coalesce(sum(c.rating_count), 0) as n "
				+ "from courses c where " + mine)
			.param("org", org).param("instructor", instructor)
			.query((rs, i) -> new Object[] { rs.getBigDecimal("total"), rs.getLong("n") })
			.single();
		long reviews = (Long) rating[1];
		BigDecimal ratingAvg = reviews == 0 ? BigDecimal.ZERO
				: ((BigDecimal) rating[0]).divide(BigDecimal.valueOf(reviews), 2, RoundingMode.HALF_UP);

		List<CourseStat> courses = jdbc.sql("select c.id, c.title, c.status, c.hue, c.icon, c.rating_avg, c.rating_count, "
				+ "(select count(*) from enrollments e where e.course_id = c.id) as learners, "
				+ "(select avg(" + PERCENT + ") from enrollments e where e.course_id = c.id) as progress "
				+ "from courses c where " + mine + " order by c.updated_at desc")
			.param("org", org).param("instructor", instructor)
			.query((rs, i) -> new CourseStat(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("status"),
					rs.getString("hue"), rs.getString("icon"), rs.getLong("learners"),
					(int) Math.round(rs.getDouble("progress")), rs.getBigDecimal("rating_avg"), rs.getInt("rating_count")))
			.list();

		List<AtRiskLearner> atRisk = jdbc.sql("select * from (select e.user_id, u.full_name, u.avatar_url, c.id as course_id, c.title, "
				+ PERCENT + " as pct, coalesce(e.last_accessed_at, e.created_at) as last_active "
				+ "from enrollments e join courses c on c.id = e.course_id join users u on u.id = e.user_id "
				+ "where " + mine + " and e.status = 'ACTIVE' and c.status = 'PUBLISHED') x "
				+ "where coalesce(x.pct, 0) < :risk and x.last_active < :idle order by x.last_active limit 20")
			.param("org", org).param("instructor", instructor).param("risk", RISK_PROGRESS)
			.param("idle", ts(now.minus(RISK_IDLE)))
			.query((rs, i) -> new AtRiskLearner(rs.getObject("user_id", UUID.class), rs.getString("full_name"),
					rs.getString("avatar_url"), rs.getObject("course_id", UUID.class), rs.getString("title"), rs.getInt("pct"),
					rs.getTimestamp("last_active").toInstant()))
			.list();

		Timestamp oldest = (Timestamp) grading[1];
		return new InstructorOverview(learners, newLearners, avg == null ? 0 : (int) Math.round(avg), (Long) grading[0],
				oldest == null ? null : oldest.toInstant(), ratingAvg, reviews, courses, atRisk);
	}

	/** Distinct active learners per day for the last week, or per week for the last seven weeks. */
	@Transactional(readOnly = true)
	List<ActivityPoint> courseActivity(CurrentUser me, UUID courseId, boolean term) {
		var course = catalog.course(me.orgId(), courseId).orElseThrow(() -> ApiException.notFound("Course"));
		if (!Enrollments.isStaff(me, course)) {
			throw ApiException.forbidden("Only this course's instructor or an admin can see its activity");
		}
		Instant now = clock.instant();
		List<ActivityPoint> out = new ArrayList<>();
		LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);
		for (int i = 6; i >= 0; i--) {
			Instant start;
			Instant end;
			String label;
			if (term) {
				end = now.minus(Duration.ofDays(7L * i));
				start = end.minus(Duration.ofDays(7));
				label = "Wk " + (7 - i);
			}
			else {
				LocalDate day = today.minusDays(i);
				start = day.atStartOfDay(ZoneOffset.UTC).toInstant();
				end = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
				label = day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
			}
			long n = jdbc.sql("select count(distinct user_id) from activity_events where course_id = ? and user_id <> ? "
					+ "and occurred_at >= ? and occurred_at < ?")
				.params(courseId, course.instructorId(), ts(start), ts(end))
				.query(Long.class).single();
			out.add(new ActivityPoint(label, start, n));
		}
		return out;
	}

	// ---- Helpers --------------------------------------------------------------------------------------------

	private long activeLearners(UUID org, Instant from, Instant to) {
		return jdbc.sql("select count(distinct user_id) from activity_events where org_id = ? and occurred_at >= ? and occurred_at < ? "
				+ "and kind in ('LESSON_VIEWED','LESSON_COMPLETED','QUIZ_SUBMITTED','ASSIGNMENT_SUBMITTED','ENROLLED',"
				+ "'THREAD_CREATED','REPLY_CREATED')")
			.params(org, ts(from), ts(to)).query(Long.class).single();
	}

	/** Completed / all enrollments as of {@code at}, in percent. */
	private double completionRate(UUID org, Instant at) {
		var row = jdbc.sql("select count(*) filter (where completed_at is not null and completed_at < ?) as done, "
				+ "count(*) as total from enrollments where org_id = ? and created_at < ?")
			.params(ts(at), org, ts(at))
			.query((rs, i) -> new long[] { rs.getLong("done"), rs.getLong("total") })
			.single();
		return row[1] == 0 ? 0 : row[0] * 100.0 / row[1];
	}

	private List<ActivityItem> recentActivity(UUID org, int limit) {
		return jdbc.sql("""
				select a.kind, a.course_id, a.occurred_at, u.full_name, c.title from activity_events a
				left join users u on u.id = a.user_id left join courses c on c.id = a.course_id
				where a.org_id = ? and a.kind in ('MEMBER_JOINED','COURSE_PUBLISHED','COURSE_COMPLETED','ORDER_PAID','ENROLLED')
				order by a.occurred_at desc limit ?""")
			.params(org, limit)
			.query((rs, i) -> {
				String who = rs.getString("full_name") == null ? "Someone" : rs.getString("full_name");
				String what = rs.getString("title");
				String kind = rs.getString("kind");
				String text = switch (kind) {
					case "MEMBER_JOINED" -> who + " joined";
					case "COURSE_PUBLISHED" -> who + " published “" + what + "”";
					case "COURSE_COMPLETED" -> who + " completed " + what;
					case "ORDER_PAID" -> who + " bought " + what;
					default -> who + " enrolled in " + what;
				};
				return new ActivityItem(kind, text, rs.getObject("course_id", UUID.class),
						rs.getTimestamp("occurred_at").toInstant());
			})
			.list();
	}

	static List<Instant[]> buckets(Range range, Instant now) {
		List<Instant[]> out = new ArrayList<>();
		if (range == Range.DAYS_30) {
			Instant start = now.minus(Duration.ofDays(30));
			for (int i = 0; i < 5; i++) {
				Instant s = start.plus(Duration.ofDays(6L * i));
				out.add(new Instant[] { s, i == 4 ? now : s.plus(Duration.ofDays(6)) });
			}
			return out;
		}
		int months = range == Range.YEAR ? 12 : 6;
		YearMonth current = YearMonth.from(now.atZone(ZoneOffset.UTC));
		for (int i = months - 1; i >= 0; i--) {
			YearMonth m = current.minusMonths(i);
			Instant s = m.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
			Instant e = i == 0 ? now : m.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
			out.add(new Instant[] { s, e });
		}
		return out;
	}

	private static String label(Range range, Instant start) {
		var date = start.atZone(ZoneOffset.UTC);
		return range == Range.DAYS_30 ? DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH).format(date)
				: date.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
	}

	private static Double delta(long now, long before) {
		return before == 0 ? null : round1((now - before) * 100.0 / before);
	}

	private static double round1(double v) {
		return Math.round(v * 10) / 10.0;
	}

	private static Timestamp ts(Instant i) {
		return Timestamp.from(i);
	}

	private static String csv(String s) {
		return s == null ? "" : "\"" + s.replace("\"", "\"\"") + "\"";
	}
}
