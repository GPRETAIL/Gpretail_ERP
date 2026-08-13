<?= $this->extend('layouts/main') ?> <!-- Optional layout wrapper -->

<?= $this->section('content') ?>

<h2>Sync Logs</h2>

<?php if (session()->getFlashdata('message')): ?>
    <div class="alert alert-success">
        <?= session()->getFlashdata('message') ?>
    </div>
<?php endif; ?>

<?php if (session()->getFlashdata('error')): ?>
    <div class="alert alert-danger">
        <?= session()->getFlashdata('error') ?>
    </div>
<?php endif; ?>

<?= form_open('log/sync', ['method' => 'post']) ?>

    <div class="form-group">
        <label for="sync_type">Sync Type</label>
        <select name="sync_type" id="sync_type" class="form-control">
            <option value="all">All Logs</option>
            <option value="latest">Latest Only</option>
        </select>
    </div>

    <button type="submit" class="btn btn-success mt-3">Start Sync</button>

<?= form_close() ?>

<?= $this->endSection() ?>
