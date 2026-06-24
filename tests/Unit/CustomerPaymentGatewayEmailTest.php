<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\SettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerPaymentGatewayEmailTest extends TestCase
{
    use RefreshDatabase;

    private function makeCustomer(string $username, string $email): Customer
    {
        $router = Router::create([
            'name' => 'Router Test',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);

        $package = Package::create([
            'name' => 'Paket 100K',
            'type' => 'pppoe',
            'price' => 100000,
            'bandwidth_limit' => '20M/20M',
            'mikrotik_profile' => '20M',
        ]);

        $user = User::factory()->create(['email' => $email]);

        return Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => $username,
            'password' => 'secret',
            'name' => 'Pelanggan ' . $username,
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 25,
        ]);
    }

    public function test_rejects_internal_mwifi_test_email_for_payment_gateways(): void
    {
        $customer = $this->makeCustomer('budi001', 'budi001@mwifi.test');

        $this->assertFalse($customer->isValidPaymentGatewayEmail('budi001@mwifi.test'));
        $this->assertSame('budi001@example.com', $customer->paymentGatewayEmail());
    }

    public function test_uses_real_customer_email_when_valid(): void
    {
        $customer = $this->makeCustomer('budi001', 'budi.santoso@gmail.com');

        $this->assertSame('budi.santoso@gmail.com', $customer->paymentGatewayEmail());
    }

    public function test_sanitizes_username_for_synthetic_email(): void
    {
        $customer = $this->makeCustomer('Budi 001!', 'budi001@mwifi.test');

        $this->assertSame('budi001@example.com', $customer->paymentGatewayEmail());
    }

    public function test_uses_company_email_domain_when_available(): void
    {
        SettingService::set('system.company_email', 'admin@rtnet.co.id', 'system', false);

        $customer = $this->makeCustomer('cust01', 'cust@mwifi.test');

        $this->assertSame('cust01@rtnet.co.id', $customer->paymentGatewayEmail());
    }
}
