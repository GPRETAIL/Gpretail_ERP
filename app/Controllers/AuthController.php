<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class AuthController extends Controller
{
    public function forgot()
    {
        helper(['form', 'url']);
        $db = \Config\Database::connect();

        // Show the forgot password form (GET)
        if ($this->request->getMethod() === 'get') {
            $setting = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
            return view('auth/forgot_password', ['setting' => $setting]);
        }

        // Handle form submission (POST)
        if ($this->request->getMethod() === 'post') {
            $email = $this->request->getPost('email');

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return redirect()->back()->with('message', 'Please enter a valid email address.');
            }

            $user = $db->table('users')->where('email', $email)->get()->getRowArray();

            if (!$user) {
                return redirect()->back()->with('message', 'Email not found.');
            }

            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

            $db->table('users')->update([
                'reset_token' => $token,
                'reset_expires_at' => $expiresAt
            ], ['id' => $user['id']]);

            $setting = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
            $resetLink = base_url('reset-password/' . $token);
            $html = view('emails/password_reset', [
                'user'    => $user,
                'token'   => $token,
                'setting' => $setting
            ]);

            $emailService = \Config\Services::email();
            $emailService->setTo($user['email']);
            $emailService->setFrom('no-reply@yourdomain.com', $setting['title'] ?? 'VINOTH POS');
            $emailService->setSubject('Reset Your Password');
            $emailService->setMessage($html);
            $emailService->setMailType('html');
            $emailService->send();

            $db->table('email_logs')->insert([
                'user_id' => $user['id'],
                'email'   => $user['email'],
                'subject' => 'Password Reset Request',
                'content' => $html
            ]);

            return redirect()->to('/login')->with('message', 'A reset link has been sent to your email address.');
        }

        return redirect()->to('/forgot')->with('message', 'Invalid request method.');
    }

    public function resetPassword($token = null)
    {
        helper(['form']);
        $db = \Config\Database::connect();

        if (!$token) {
            return redirect()->to('/login')->with('message', 'Invalid token.');
        }

        $user = $db->table('users')
            ->where('reset_token', $token)
            ->where('reset_expires_at >=', date('Y-m-d H:i:s'))
            ->get()
            ->getRowArray();

        if (!$user) {
            return redirect()->to('/login')->with('message', 'Reset link expired or invalid.');
        }

        if ($this->request->getMethod() === 'post') {
            $rules = [
                'password'      => 'required|min_length[6]',
                'pass_confirm'  => 'required|matches[password]'
            ];

            if (!$this->validate($rules)) {
                return view('auth/reset_password', [
                    'token'   => $token,
                    'setting' => $db->table('settings')->getWhere(['id' => 1])->getRowArray(),
                    'message' => implode('<br>', $this->validator->getErrors())
                ]);
            }

            $hashed = password_hash($this->request->getPost('password'), PASSWORD_DEFAULT);

            $db->table('users')->update(
                ['password' => $hashed, 'reset_token' => null, 'reset_expires_at' => null],
                ['id' => $user['id']]
            );

            return redirect()->to('/login')->with('message', 'Password reset successful. Please log in.');
        }

        return view('auth/reset_password', [
            'token'   => $token,
            'setting' => $db->table('settings')->getWhere(['id' => 1])->getRowArray()
        ]);
    }
}
