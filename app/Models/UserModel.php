<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $allowedFields = [
        'username',
        'firstname',
        'lastname',
        'hashed_password',
        'email',
        'useraddr',
        'role',
        'last_active',
        'avatar',
        'created_at',
        'store_id',
        'loginstatus',
        'myy_address',
        'browser_name',
        'd_s_re',
        'd_p_re',
        'm_s_re',
        'm_p_re',
        'd_s_sh',
        'd_p_sh',
        'm_s_sh',
        'm_p_sh',
        'pprintername',
        'attime'
    ];

    protected $returnType       = 'object';
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    public function allUsers()
    {
        return $this->findAll();
    }

    public function createUser($data)
    {
        return $this->insert($data);
    }

    public function findUser($id)
    {
        return $this->find($id);
    }

    public function validateLogin($username, $password)
    {
        $user = $this->where('username', $username)->first();
        if ($user && $this->validatePassword($user->hashed_password, $password)) {
            session()->set('user', $user);
            session()->set('role', $user->role);
            return $user;
        }
        return false;
    }

    public function setPassword($id, $plaintext)
    {
        $hashed_password = $this->hashPassword($plaintext);
        return $this->update($id, ['hashed_password' => $hashed_password]);
    }

    public function login($userId)
    {
        session()->set('user_id', $userId);
    }

    public function logout()
    {
        $userId = session('user_id');
        if ($userId) {
            $this->update($userId, [
                'last_active' => date('Y-m-d H:i:s'),
                'loginstatus' => 0,
                'browser_name' => '',
                'myy_address' => ''
            ]);
        }
        session()->destroy();
    }

    // ===========================
    // Password Hashing Functions
    // ===========================
    private function hashPassword($password)
    {
        $salt = bin2hex(random_bytes(32));
        $hash = hash('sha256', $salt . $password);
        return $salt . $hash;
    }

    private function validatePassword($hashedPassword, $password)
    {
        $salt = substr($hashedPassword, 0, 64);
        $hash = substr($hashedPassword, 64, 64);
        return (hash('sha256', $salt . $password) === $hash);
    }

    // ===========================
    // Browser Info
    // ===========================
    public function getBrowserInfo()
    {
        $u_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        $platform = 'Unknown';
        $bname = 'Unknown';
        $version = '';

        if (preg_match('/linux/i', $u_agent)) {
            $platform = 'Linux';
        } elseif (preg_match('/macintosh|mac os x/i', $u_agent)) {
            $platform = 'Mac';
        } elseif (preg_match('/windows|win32/i', $u_agent)) {
            $platform = 'Windows';
        }

        if (preg_match('/MSIE/i', $u_agent) && !preg_match('/Opera/i', $u_agent)) {
            $bname = 'Internet Explorer';
        } elseif (preg_match('/Firefox/i', $u_agent)) {
            $bname = 'Mozilla Firefox';
        } elseif (preg_match('/Chrome/i', $u_agent)) {
            $bname = 'Google Chrome';
        } elseif (preg_match('/Safari/i', $u_agent)) {
            $bname = 'Apple Safari';
        } elseif (preg_match('/Opera/i', $u_agent)) {
            $bname = 'Opera';
        } elseif (preg_match('/Netscape/i', $u_agent)) {
            $bname = 'Netscape';
        }

        return [
            'userAgent' => $u_agent,
            'name'      => $bname,
            'version'   => $version,
            'platform'  => $platform
        ];
    }
}
