<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Printable Log View</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
        }

        h2 {
            text-align: center;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
        }

        th, td {
            padding: 10px;
            border: 1px solid #444;
            text-align: left;
        }

        @media print {
            body {
                margin: 0;
            }

            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>

<h2>Log Details</h2>

<?php if (isset($log) && is_array($log)): ?>
    <table>
        <tr>
            <th>ID</th>
            <td><?= esc($log['id']) ?></td>
        </tr>
        <tr>
            <th>User</th>
            <td><?= esc($log['username']) ?></td>
        </tr>
        <tr>
            <th>Action</th>
            <td><?= esc($log['action']) ?></td>
        </tr>
        <tr>
            <th>IP Address</th>
            <td><?= esc($log['ip_address']) ?></td>
        </tr>
        <tr>
            <th>Date</th>
            <td><?= esc($log['created_at']) ?></td>
        </tr>
    </table>
<?php else: ?>
    <p>No log data found.</p>
<?php endif; ?>

<div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()">Print</button>
    <a href="<?= base_url('log/viewall') ?>" style="margin-left: 20px;">Back</a>
</div>

</body>
</html>
