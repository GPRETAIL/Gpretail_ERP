<?= $this->extend('layouts/main') ?> <!-- If you're using layout; otherwise remove -->

<?= $this->section('content') ?>

<h2>All Logs</h2>

<?php if (session()->getFlashdata('message')): ?>
    <div class="alert alert-success">
        <?= session()->getFlashdata('message') ?>
    </div>
<?php endif; ?>

<table class="table table-bordered">
    <thead>
        <tr>
            <th>ID</th>
            <th>User</th>
            <th>Action</th>
            <th>IP Address</th>
            <th>Date</th>
            <!-- Add more columns if needed -->
        </tr>
    </thead>
    <tbody>
        <?php if (!empty($logs) && is_array($logs)): ?>
            <?php foreach ($logs as $log): ?>
                <tr>
                    <td><?= esc($log['id']) ?></td>
                    <td><?= esc($log['username']) ?></td>
                    <td><?= esc($log['action']) ?></td>
                    <td><?= esc($log['ip_address']) ?></td>
                    <td><?= esc($log['created_at']) ?></td>
                </tr>
            <?php endforeach; ?>
        <?php else: ?>
            <tr>
                <td colspan="5">No logs found.</td>
            </tr>
        <?php endif; ?>
    </tbody>
</table>

<?= $this->endSection() ?>
