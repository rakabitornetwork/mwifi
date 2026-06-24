<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Services\CustomerOtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomerOtpAuthController extends Controller
{
    public function create(Request $request)
    {
        if ($request->user()?->customer) {
            return redirect('/customer/dashboard');
        }

        return Inertia::render('Customer/Login', [
            'phone' => $request->session()->get('portal_otp_phone', ''),
            'otp_sent' => (bool) $request->session()->get('portal_otp_sent', false),
            'masked_phone' => $request->session()->get('portal_otp_masked_phone'),
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

        $request->session()->forget(['portal_otp_phone', 'portal_otp_sent', 'portal_otp_masked_phone']);

        return redirect()->intended('/customer/dashboard');
    }

    public function resetOtp(Request $request)
    {
        $request->session()->forget(['portal_otp_phone', 'portal_otp_sent', 'portal_otp_masked_phone']);

        return redirect()->route('portal.login');
    }
}
