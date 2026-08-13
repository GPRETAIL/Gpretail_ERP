<!-- app/Views/log/edit.php -->

<div class="container">
    <h3>Edit Category</h3>
    <hr>

    <div class="row" style="margin-top:20px;">
        <a class="btn btn-default float-right" href="#" onclick="history.back(-1)" style="margin-bottom:10px;">
            <i class="fa fa-arrow-left"></i> Back
        </a>

        <?php echo form_open('log/edit/' . esc($log['id'])); ?>
            <div class="form-group">
                <label for="CategoryName">Category Name</label>
                <input type="text" name="CategoryName" value="<?= esc($log['name']); ?>" class="form-control" id="CategoryName" placeholder="Enter Category Name" required>
            </div>

            <button type="submit" class="btn btn-primary">Submit</button>
        <?php echo form_close(); ?>
    </div>
</div>
<?= $this->extend('layouts/main') ?> <!-- Optional layout -->

<?= $this->section('content') ?>

<h2>Edit Log Entry</h2>

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

<?= \Config\Services::validation()->listErrors(); ?>

<?= form_open('log/update/' . esc($log['id']), ['method' => 'post']) ?>

    <div class="form-group">
        <label for="username">User</label>
        <input type="text" name="username" class="form-control" id="username" value="<?= esc($log['username']) ?>" required>
    </div>

    <div class="form-group">
        <label for="action">Action</label>
        <input type="text" name="action" class="form-control" id="action" value="<?= esc($log['action']) ?>" required>
    </div>

    <div class="form-group">
        <label for="ip_address">IP Address</label>
        <input type="text" name="ip_address" class="form-control" id="ip_address" value="<?= esc($log['ip_address']) ?>" required>
    </div>

    <div class="form-group">
        <label for="created_at">Date</label>
        <input type="datetime-local" name="created_at" class="form-control" id="created_at" value="<?= esc(date('Y-m-d\TH:i', strtotime($log['created_at']))) ?>" required>
    </div>

    <button type="submit" class="btn btn-primary mt-3">Update</button>

<?= form_close() ?>

<a href="<?= base_url('log/viewall') ?>" class="btn btn-secondary mt-2">Cancel</a>

<?= $this->endSection() ?>
