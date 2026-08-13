<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title><?= esc($setting->title ?? 'GPRETAIL Login') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="icon" href="<?= base_url('public/assets/pos.ico') ?>">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <link rel="stylesheet" href="<?= base_url('public/assets/css/sweetalert.css') ?>">

    <style>
        html,
        body {
            height: 100%;
            margin: 0;
            background: url("<?= base_url('public/assets/img/login.jpg') ?>") no-repeat center center fixed;
            background-size: cover;
            font-family: 'Segoe UI', sans-serif;
            overflow: hidden;
        }

        .login-wrapper {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            /* align from top */
            height: 100%;
            padding: 40px 20px;
            /* top padding pushes it lower */
        }

        .login-card {
            width: 100%;
            max-width: 420px;
            background: rgba(255, 255, 255, 0.6);
            /* more transparent */
            backdrop-filter: blur(12px);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
            margin-top: 40px;
            /* slight downward push */
        }


        .brand-logo {
            text-align: center;
            margin-bottom: 10px;
        }

        .brand-logo i {
            font-size: 48px;
            color: #0d6efd;
        }

        #greetingMessage {
            font-size: 1.1rem;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            color: #0d47a1;
        }

        .blink {
            animation: blink-animation 1s steps(2, start) infinite;
        }

        @keyframes blink-animation {
            to {
                visibility: hidden;
            }
        }

        h2 {
            text-align: center;
            font-weight: 600;
            color: #0d47a1;
            margin-bottom: 25px;
        }

        .form-control {
            border-radius: 10px;
        }

        .btn-primary {
            border-radius: 10px;
        }

        .forgot-link {
            text-align: center;
            margin-top: 15px;
        }

        .forgot-link a {
            font-size: 0.9rem;
            color: #555;
            text-decoration: none;
        }

        .forgot-link a:hover {
            color: #0d47a1;
        }

        .alert {
            animation: fadeIn 0.4s ease-in-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-5px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 768px) {
            .login-wrapper {
                justify-content: center;
                padding: 20px;
            }

            .login-card {
                max-width: 100%;
            }
        }
    </style>
</head>

<body>
    <div class="login-wrapper">
        <div class="login-card">
            <!-- Brand Icon -->
            <div class="brand-logo">
                <i class="bi bi-shop-window"></i>
            </div>

            <!-- Greeting Message -->
            <div id="greetingMessage">Loading...</div>

            <!-- Page Title -->
            <h2>Login to GPRETAIL</h2>

            <!-- Error Alert -->
            <?php if (isset($message)): ?>
                <div class="alert alert-danger text-center shadow-sm rounded-pill px-4 py-2 mb-3" style="font-weight: 500;">
                    <i class="bi bi-exclamation-circle me-2"></i><?= esc($message) ?>
                </div>
            <?php endif; ?>

            <!-- Login Form -->
            <?= form_open('login') ?>

            <?php
            $query = $db->table('stores')->get()->getResult();
            if (count($query) > 0): ?>
                <div class="mb-3">
                    <select name="store_id" class="form-select" id="store_id" required>
                        <option value="">Select Store</option>
                        <?php foreach ($query as $store): ?>
                            <option value="<?= esc($store->id) ?>"><?= esc($store->name) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            <?php endif; ?>

            <div class="mb-3">
                <input type="text" name="username" id="username" class="form-control" required autofocus placeholder="Username" value="<?= esc($username ?? '') ?>">
            </div>

            <div class="mb-3">
                <input type="password" name="password" id="password" class="form-control" required placeholder="Password">
            </div>

            <div class="d-grid mt-2">
                <button type="submit" class="btn btn-primary">Login</button>
            </div>

            <?= form_close() ?>

            <div class="forgot-link mt-3">
                <a href="<?= base_url('forgot') ?>"><i class="bi bi-question-circle"></i> Forgot Password?</a>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="<?= base_url('public/assets/js/jquery-2.2.2.min.js') ?>"></script>
    <script src="<?= base_url('public/assets/js/sweetalert.min.js') ?>"></script>

    <script>
        // Time-based greeting
        document.addEventListener("DOMContentLoaded", function() {
            const now = new Date();
            const hour = now.getHours();
            let greeting = "👁️‍🗨️ Welcome";

            if (hour >= 5 && hour < 12) {
                greeting = "🌞 Good Morning";
            } else if (hour >= 12 && hour < 17) {
                greeting = "🌤️ Good Afternoon";
            } else if (hour >= 17 && hour < 21) {
                greeting = "🌇 Good Evening";
            } else {
                greeting = "🌙 Good Night";
            }

            document.querySelector('#greetingMessage').textContent = greeting;
        });

        // SweetAlert fallback
        <?php if (isset($message)): ?>
            swal("<?= esc($message) ?>");
        <?php endif; ?>
    </script>
</body>

</html>