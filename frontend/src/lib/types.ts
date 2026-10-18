/** Types mirroring the Spring Boot API responses (see backend/docs/API.md). */

export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";
export type Uuid = string;

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface Problem {
  status: number;
  code: string;
  detail: string;
  errors?: Record<string, string>;
}

// ---- Identity ----------------------------------------------------------------------------------

export interface UserView {
  id: Uuid;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface OrgView {
  id: Uuid;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserView;
  organization: OrgView;
  role: Role;
}

export interface MeResponse {
  user: UserView;
  organization: OrgView;
  role: Role;
}

export interface MembershipView {
  membershipId: Uuid;
  organization: OrgView;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
}

export interface MemberView {
  id: Uuid;
  userId: Uuid;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  joinedAt: string;
  lastActiveAt: string | null;
}

export interface MemberCounts {
  everyone: number;
  students: number;
  instructors: number;
  admins: number;
}

export interface InviteView {
  id: Uuid;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
}

export interface CreatedInvite {
  id: Uuid;
  email: string;
  role: Role;
  expiresAt: string;
  link: string;
}

export interface InvitePreview {
  email: string;
  role: Role;
  organization: OrgView;
  existingAccount: boolean;
}

export interface OrgSettingsView {
  id: Uuid;
  name: string;
  slug: string;
  logoUrl: string | null;
  seatLimit: number | null;
  selfSignup: boolean;
  seatsUsed: number;
  pendingInvites: number;
}

// ---- Catalog ------------------------------------------------------------------------------------

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type LessonKind = "VIDEO" | "READING" | "QUIZ" | "ASSIGNMENT";
export type Hue = "orbit" | "coral" | "sky" | "green" | "amber" | "ink";

export interface CategoryView {
  id: Uuid;
  name: string;
  slug: string;
  icon: string;
  hue: Hue;
  position: number;
  courseCount: number;
}

export interface CourseCard {
  id: Uuid;
  slug: string;
  title: string;
  tagline: string | null;
  categoryName: string | null;
  hue: Hue;
  icon: string;
  coverUrl: string | null;
  level: CourseLevel;
  priceCents: number;
  currency: string;
  featured: boolean;
  durationMinutes: number;
  lessonCount: number;
  enrollmentCount: number;
  ratingAvg: number;
  ratingCount: number;
  instructorId: Uuid;
  instructorName: string | null;
  status: CourseStatus;
}

export interface LessonOutline {
  id: Uuid;
  title: string;
  kind: LessonKind;
  position: number;
  durationMinutes: number;
  preview: boolean;
}

export interface SectionOutline {
  id: Uuid;
  title: string;
  position: number;
  lessons: LessonOutline[];
}

export interface InstructorView {
  id: Uuid;
  fullName: string;
  avatarUrl: string | null;
  publishedCourses: number;
}

export interface CourseDetail {
  course: CourseCard;
  description: string | null;
  outcomes: string[];
  category: CategoryView | null;
  instructor: InstructorView | null;
  curriculum: SectionOutline[];
  publishedAt: string | null;
}

export interface LessonView {
  id: Uuid;
  sectionId: Uuid;
  title: string;
  kind: LessonKind;
  position: number;
  durationMinutes: number;
  content: string | null;
  preview: boolean;
}

export interface SectionView {
  id: Uuid;
  title: string;
  position: number;
  lessons: LessonView[];
}

export interface CourseEditorView {
  course: CourseCard;
  description: string | null;
  outcomes: string[];
  categoryId: Uuid | null;
  publishedAt: string | null;
  sections: SectionView[];
}

export interface WishlistEntry {
  course: CourseCard;
  addedAt: string;
}

// ---- Learning -----------------------------------------------------------------------------------

export type EnrollmentStatus = "ACTIVE" | "COMPLETED";
export type EnrollmentSource = "FREE" | "PURCHASE" | "ASSIGNED";

export interface Progress {
  completedLessons: number;
  totalLessons: number;
  percent: number;
}

export interface EnrollmentView {
  id: Uuid;
  course: CourseCard;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  progress: Progress;
  lastLessonId: Uuid | null;
  lastAccessedAt: string | null;
  enrolledAt: string;
  completedAt: string | null;
  certificateCode: string | null;
}

export interface PlayerLesson {
  id: Uuid;
  title: string;
  kind: LessonKind;
  position: number;
  durationMinutes: number;
  completed: boolean;
}

export interface PlayerSection {
  id: Uuid;
  title: string;
  position: number;
  lessons: PlayerLesson[];
}

export interface PlayerView {
  course: CourseCard;
  enrollmentId: Uuid | null;
  status: EnrollmentStatus | null;
  progress: Progress;
  resumeLessonId: Uuid | null;
  sections: PlayerSection[];
  staffPreview: boolean;
  certificateCode: string | null;
}

export interface LessonContent {
  id: Uuid;
  courseId: Uuid;
  sectionId: Uuid;
  title: string;
  kind: LessonKind;
  durationMinutes: number;
  content: string | null;
  completed: boolean;
  positionSeconds: number;
  previousLessonId: Uuid | null;
  nextLessonId: Uuid | null;
}

export interface CompletionResult {
  lessonId: Uuid;
  completed: boolean;
  progress: Progress;
  status: EnrollmentStatus;
  certificateCode: string | null;
}

export interface LearningSummary {
  inProgress: number;
  completed: number;
  lessonsThisWeek: number;
  minutesLearned: number;
  continueLearning: EnrollmentView[];
}

export interface ReviewView {
  id: Uuid;
  rating: number;
  comment: string | null;
  userId: Uuid;
  userName: string | null;
  userAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  histogram: Record<string, number>;
}

export interface LearnerView {
  enrollmentId: Uuid;
  userId: Uuid;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  progress: Progress;
  enrolledAt: string;
  lastAccessedAt: string | null;
  completedAt: string | null;
}

export interface CertificateView {
  code: string;
  learnerName: string;
  courseTitle: string;
  organizationName: string;
  completedAt: string;
}

// ---- Assessment ---------------------------------------------------------------------------------

export type QuestionKind = "SINGLE" | "MULTIPLE";
export type SubmissionStatus = "SUBMITTED" | "GRADED" | "RETURNED";

export interface QuestionEditorView {
  id: Uuid;
  position: number;
  prompt: string;
  kind: QuestionKind;
  options: string[];
  correct: number[];
  explanation: string | null;
  points: number;
}

export interface QuizEditorView {
  id: Uuid;
  lessonId: Uuid;
  courseId: Uuid;
  passPercent: number;
  maxAttempts: number | null;
  dueAt: string | null;
  questions: QuestionEditorView[];
}

export interface QuestionView {
  id: Uuid;
  position: number;
  prompt: string;
  kind: QuestionKind;
  options: string[];
  points: number;
}

export interface AttemptSummary {
  id: Uuid;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  submittedAt: string;
}

export interface QuizView {
  id: Uuid;
  lessonId: Uuid;
  passPercent: number;
  maxAttempts: number | null;
  attemptsLeft: number | null;
  dueAt: string | null;
  questions: QuestionView[];
  attempts: AttemptSummary[];
  passed: boolean;
}

export interface QuestionResult {
  questionId: Uuid;
  selected: number[];
  correctOptions: number[];
  correct: boolean;
  explanation: string | null;
}

export interface AttemptResult {
  attempt: AttemptSummary;
  questions: QuestionResult[];
  attemptsLeft: number | null;
  lessonCompleted: boolean;
}

export interface AssignmentEditorView {
  id: Uuid;
  lessonId: Uuid;
  courseId: Uuid;
  instructions: string | null;
  dueAt: string | null;
  maxPoints: number;
  allowLate: boolean;
}

export interface SubmissionView {
  id: Uuid;
  assignmentId: Uuid;
  lessonId: Uuid;
  courseId: Uuid;
  userId: Uuid;
  learnerName: string | null;
  learnerAvatarUrl: string | null;
  status: SubmissionStatus;
  body: string | null;
  linkUrl: string | null;
  fileId: Uuid | null;
  fileName: string | null;
  submittedAt: string;
  late: boolean;
  points: number | null;
  maxPoints: number;
  feedback: string | null;
  gradedAt: string | null;
  lessonTitle: string | null;
  courseTitle: string | null;
}

export interface AssignmentView {
  id: Uuid;
  lessonId: Uuid;
  instructions: string | null;
  dueAt: string | null;
  maxPoints: number;
  allowLate: boolean;
  submission: SubmissionView | null;
}

export interface Deadline {
  kind: "QUIZ" | "ASSIGNMENT";
  lessonId: Uuid;
  title: string | null;
  courseId: Uuid;
  courseTitle: string | null;
  courseHue: Hue | null;
  dueAt: string;
  overdue: boolean;
}

export interface GradeColumn {
  lessonId: Uuid;
  title: string;
  kind: "QUIZ" | "ASSIGNMENT";
  maxPoints: number;
  dueAt: string | null;
}

export interface GradeCell {
  lessonId: Uuid;
  percent: number | null;
  points: number | null;
  status: string;
}

export interface GradeRow {
  userId: Uuid;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  cells: GradeCell[];
  averagePercent: number | null;
}

export interface Gradebook {
  courseId: Uuid;
  courseTitle: string;
  columns: GradeColumn[];
  rows: GradeRow[];
  classAveragePercent: number | null;
}

export interface MyGrade {
  courseId: Uuid;
  courseTitle: string | null;
  lessonId: Uuid;
  title: string | null;
  kind: "QUIZ" | "ASSIGNMENT";
  percent: number | null;
  points: number | null;
  maxPoints: number | null;
  status: string;
  feedback: string | null;
  at: string;
}

// ---- Schedule & discussion -----------------------------------------------------------------------

export type SessionKind = "LIVE_CLASS" | "OFFICE_HOURS" | "STUDY_GROUP" | "WORKSHOP";

export interface SessionView {
  id: Uuid;
  courseId: Uuid;
  courseTitle: string | null;
  courseHue: Hue | null;
  title: string;
  description: string | null;
  kind: SessionKind;
  startsAt: string;
  endsAt: string;
  meetingUrl: string | null;
  location: string | null;
  hostId: Uuid;
  hostName: string | null;
  cancelled: boolean;
}

export interface Author {
  id: Uuid;
  fullName: string;
  avatarUrl: string | null;
  staff: boolean;
}

export interface ThreadSummary {
  id: Uuid;
  courseId: Uuid;
  lessonId: Uuid | null;
  title: string | null;
  body: string;
  author: Author | null;
  pinned: boolean;
  resolved: boolean;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
}

export interface ReplyView {
  id: Uuid;
  threadId: Uuid;
  body: string;
  author: Author | null;
  answer: boolean;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
}

export interface ThreadDetail {
  thread: ThreadSummary;
  replies: ReplyView[];
}

// ---- Billing ------------------------------------------------------------------------------------

export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export interface CheckoutResponse {
  orderId: Uuid;
  checkoutUrl: string;
  provider: string;
}

export interface OrderView {
  id: Uuid;
  courseId: Uuid;
  courseTitle: string | null;
  courseSlug: string | null;
  userId: Uuid;
  buyerName: string | null;
  buyerEmail: string | null;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  provider: string;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  refundable: boolean;
}

export interface RevenueSummary {
  since: string;
  paid: { currency: string; amountCents: number; orders: number }[];
  refunded: { currency: string; amountCents: number; orders: number }[];
}

// ---- Media --------------------------------------------------------------------------------------

export type FilePurpose = "AVATAR" | "ORG_LOGO" | "COURSE_COVER" | "RESOURCE" | "SUBMISSION";

export interface UploadTicket {
  fileId: Uuid;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  expiresAt: string;
}

export interface FileView {
  id: Uuid;
  purpose: FilePurpose;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: "PENDING" | "READY";
  publicUrl: string | null;
  createdAt: string;
}

export interface ResourceView {
  id: Uuid;
  courseId: Uuid;
  lessonId: Uuid | null;
  title: string;
  kind: "FILE" | "LINK";
  fileId: Uuid | null;
  fileName: string | null;
  sizeBytes: number | null;
  contentType: string | null;
  url: string | null;
  position: number;
}

export interface VideoView {
  lessonId: Uuid;
  provider: "MUX" | "URL";
  status: "WAITING_UPLOAD" | "PROCESSING" | "READY" | "ERRORED";
  streamUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

// ---- Notifications & analytics ------------------------------------------------------------------

export interface NotificationView {
  id: Uuid;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Metric {
  value: number;
  delta: number | null;
}

export interface AdminOverview {
  range: "DAYS_30" | "MONTHS_6" | "YEAR";
  activeLearners: Metric;
  coursesLive: Metric;
  completionRatePercent: Metric;
  seats: { used: number; limit: number | null; percent: number | null };
  series: { label: string; start: string; enrollments: number; completions: number }[];
  recentActivity: { kind: string; text: string; courseId: Uuid | null; at: string }[];
}

export interface CourseStat {
  courseId: Uuid;
  title: string;
  status: CourseStatus;
  hue: Hue;
  icon: string;
  learners: number;
  averageProgressPercent: number;
  rating: number;
  ratingCount: number;
}

export interface AtRiskLearner {
  userId: Uuid;
  fullName: string;
  avatarUrl: string | null;
  courseId: Uuid;
  courseTitle: string;
  progressPercent: number;
  lastActiveAt: string;
}

export interface InstructorOverview {
  enrolledLearners: number;
  newLearners90Days: number;
  averageCompletionPercent: number;
  toGrade: number;
  oldestUngradedAt: string | null;
  rating: number;
  reviewCount: number;
  courses: CourseStat[];
  atRisk: AtRiskLearner[];
}

export interface ActivityPoint {
  label: string;
  start: string;
  activeLearners: number;
}
