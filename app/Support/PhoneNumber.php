<?php

namespace App\Support;

class PhoneNumber
{
    /**
     * Normalize Indonesian phone numbers to digits with 62 country prefix.
     */
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', trim($phone)) ?? '';
        $digits = preg_replace('/^0/', '62', $digits) ?? $digits;

        return $digits;
    }

    /**
     * @return list<string>
     */
    public static function variants(string $phone): array
    {
        $normalized = self::normalize($phone);

        if ($normalized === '') {
            return [];
        }

        $variants = [$normalized];

        if (str_starts_with($normalized, '62') && strlen($normalized) > 2) {
            $variants[] = '0' . substr($normalized, 2);
        }

        return array_values(array_unique($variants));
    }

    public static function matches(string $phoneA, string $phoneB): bool
    {
        $variantsA = self::variants($phoneA);
        $variantsB = self::variants($phoneB);

        if ($variantsA === [] || $variantsB === []) {
            return false;
        }

        return array_intersect($variantsA, $variantsB) !== [];
    }

    public static function mask(string $phone): string
    {
        $normalized = self::normalize($phone);

        if (strlen($normalized) < 6) {
            return '***';
        }

        $visiblePrefix = substr($normalized, 0, 4);
        $visibleSuffix = substr($normalized, -3);

        return $visiblePrefix . str_repeat('*', max(3, strlen($normalized) - 7)) . $visibleSuffix;
    }
}
