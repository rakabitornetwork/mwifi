<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\CustomerOtpService;
use App\Services\VpsCatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomerOtpAuthController extends Controller
{
    public function create(Request $request)
    {
        if ($request->user()?->customer) {
            $redirect = $this->sanitizeRedirect($request->query('redirect'));

            return redirect($redirect ?: '/customer/dashboard');
        }

        $redirect = $this->sanitizeRedirect($request->query('redirect'));
        if ($redirect) {
            $request->session()->put('portal_intended_url', $redirect);
        }

        return Inertia::render('Customer/Login', [
            'phone' => $request->session()->get('portal_otp_phone', ''),
            'otp_sent' => (bool) $request->session()->get('portal_otp_sent', false),
            'masked_phone' => $request->session()->get('portal_otp_masked_phone'),
            'redirect_after_login' => $redirect,
        ]);
    }

    public function requestOtp(Request $request)
    {
        $request->validate([
            'phone_number' => ['required', 'string', 'max:20'],
        ]);

        $phone = $request->input('phone_number');
        $result = CustomerOtpService::requestOtp($phone);

        if (!$result['ok']) {
            throw ValidationException::withMessages([
                'phone_number' => $result['message'],
            ]);
        }

        $request->session()->put('portal_otp_phone', $phone);
        $request->session()->put('portal_otp_sent', true);
        $request->session()->put('portal_otp_masked_phone', $result['masked_phone'] ?? null);

        return redirect()
            ->route('portal.login')
            ->with('success', $result['message']);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone_number' => ['required', 'string', 'max:20'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $result = CustomerOtpService::verifyOtp(
            $request->input('phone_number'),
            $request->input('otp'),
        );

        if (!$result['ok']) {
            throw ValidationException::withMessages([
                'otp' => $result['message'],
            ]);
        }

        $user = $result['customer']->user;

        Auth::login($user);
        $request->session()->regenerate();

        $intended = $this->sanitizeRedirect($request->session()->pull('portal_intended_url'));
        if ($intended !== null && $this->isVpsCatalogRedirect($intended)) {
            $request->session()->put('customer_portal_vps_showcase', true);
            $intended = '/customer/dashboard';
        }
        $request->session()->forget(['portal_otp_phone', 'portal_otp_sent', 'portal_otp_masked_phone']);

        return redirect($intended ?: '/customer/dashboard');
    }

    protected function isVpsCatalogRedirect(string $url): bool
    {
        $path = strtok($url, '?') ?: $url;

        return $path === '/layanan/vps' || str_starts_with($path, '/layanan/vps/');
    }

    public function resetOtp(Request $request)
    {
        $request->session()->forget(['portal_otp_phone', 'portal_otp_sent', 'portal_otp_masked_phone']);

        return redirect()->route('portal.login');
    }

    public function demoLogin(Request $request, Customer $customer)
    {
        if (! VpsCatalogService::isEnabled() || ! VpsCatalogService::isShowcaseCustomer($customer)) {
            abort(403, 'Link akses demo tidak valid atau sudah tidak aktif.');
        }

        $user = $customer->user;

        if (! $user) {
            abort(403, 'Akun pelanggan demo tidak ditemukan.');
        }

        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put('customer_portal_vps_showcase', true);
        $request->session()->forget(['portal_otp_phone', 'portal_otp_sent', 'portal_otp_masked_phone']);

        Log::info('VPS demo login link used.', [
            'customer_id' => $customer->id,
            'ip' => $request->ip(),
        ]);

        return redirect('/customer/dashboard');
    }

    protected function sanitizeRedirect(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        if (! str_starts_with($url, '/') || str_starts_with($url, '//')) {
            return null;
        }

        return $url;
    }
}
