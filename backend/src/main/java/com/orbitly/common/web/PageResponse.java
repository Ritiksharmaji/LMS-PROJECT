package com.orbitly.common.web;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/** Stable JSON shape for paginated lists (Spring's {@code Page} serialization is not a public contract). */
public record PageResponse<T>(List<T> items, int page, int size, long total, int totalPages) {

	public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
		return new PageResponse<>(page.map(mapper).getContent(), page.getNumber(), page.getSize(),
				page.getTotalElements(), page.getTotalPages());
	}
}
