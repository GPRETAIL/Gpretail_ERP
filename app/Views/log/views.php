<?= $this->extend('layouts/main') ?> <!-- Optional layout usage -->

<?= $this->section('content') ?>

<h2>Log Details</h2>

<?php if (isset($log) && is_array($log)): ?>
    <table class="table table-striped">
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
        <!-- Add more fields if necessary -->
    </table>

    <a href="<?= base_url('log/viewall') ?>" class="btn btn-primary">Back to Log List</a>

<?php else: ?>
    <div class="alert alert-warning">Log entry not found.</div>
<?php endif; ?>

<?= $this->endSection() ?>
