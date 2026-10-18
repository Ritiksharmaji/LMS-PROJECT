package com.orbitly.identity;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.orbitly.common.web.ApiException;

/** An organization's seat limit caps its active members. */
@Component
class SeatPolicy {

	private final MembershipRepository memberships;

	SeatPolicy(MembershipRepository memberships) {
		this.memberships = memberships;
	}

	void requireFreeSeat(Organization org) {
		Integer limit = org.getSeatLimit();
		if (limit != null && memberships.countActive(org.getId()) >= limit) {
			throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "seat_limit_reached",
					org.getName() + " has no free seats. Ask an admin to add more.");
		}
	}
}
