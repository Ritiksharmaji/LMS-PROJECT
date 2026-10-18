package com.orbitly.common.web;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

/** URL slugs: "Intro to Machine Learning!" → "intro-to-machine-learning". */
public final class Slugs {

	private Slugs() {
	}

	public static String of(String text) {
		String ascii = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
		String slug = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
		if (slug.length() > 100) {
			slug = slug.substring(0, 100).replaceAll("-+$", "");
		}
		return slug.isEmpty() ? "item" : slug;
	}

	/** {@link #of} plus "-2", "-3"… until {@code taken} says the slug is free. */
	public static String unique(String text, Predicate<String> taken) {
		String base = of(text);
		String candidate = base;
		for (int n = 2; taken.test(candidate); n++) {
			candidate = base + "-" + n;
		}
		return candidate;
	}
}
