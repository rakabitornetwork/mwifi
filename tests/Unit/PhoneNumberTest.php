<?php

namespace Tests\Unit;

use App\Support\PhoneNumber;
use PHPUnit\Framework\TestCase;

class PhoneNumberTest extends TestCase
{
    public function test_matches_across_local_and_international_formats(): void
    {
        $this->assertTrue(PhoneNumber::matches('081234567890', '6281234567890'));
        $this->assertTrue(PhoneNumber::matches('+62 812-3456-7890', '081234567890'));
        $this->assertFalse(PhoneNumber::matches('081234567890', '6289999999999'));
    }
}
