<!-- app/Views/log/index.php -->

<div class="container">
    <h3>Welcome to the Log System</h3>
    <hr>

    <div class="row">
        <div class="col-md-12">
            <h4>Available Categories</h4>
            <ul>
                <?php foreach ($categories as $category): ?>
                    <li>
                        <a href="<?= base_url('log/edit/' . esc($category->id)); ?>">
                            <?= esc($category->name); ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>
</div>
