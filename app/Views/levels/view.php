<?= $this->extend('layouts/main') ?> <!-- Adjust layout if needed -->

<?= $this->section('content') ?>
<div class="container">
    <h2>Levels View</h2>

    <?php if (isset($categories)): ?>
        <h4>Categories List</h4>
        <table border="1" cellpadding="8">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th> <!-- Adjust fields as per your DB schema -->
                </tr>
            </thead>
            <tbody>
                <?php foreach ($categories as $category): ?>
                    <tr>
                        <td><?= esc($category['id']) ?></td>
                        <td><?= esc($category['name']) ?></td>
                        <td><?= esc($category['description']) ?></td>
                    </tr>
                <?php endforeach ?>
            </tbody>
        </table>
    <?php endif; ?>

    <?php if (isset($zsz)): ?>
        <h4>Selected Warehouse ID: <?= esc($zsz) ?></h4>
    <?php endif; ?>
</div>
<?= $this->endSection() ?>
