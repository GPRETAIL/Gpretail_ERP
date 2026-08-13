<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class Export extends Controller
{
    protected $tasksPath = WRITEPATH . 'exports/';

    public function start()
    {
        helper('filesystem');
        if (!is_dir($this->tasksPath)) {
            mkdir($this->tasksPath, 0777, true);
        }

        $type = $this->request->getPost('type') ?? 'csv';
        $ext = $type === 'excel' ? 'xlsx' : ($type === 'pdf' ? 'pdf' : 'csv');

        $taskId = uniqid('export_', true);
        $filename = $this->tasksPath . $taskId . '.' . $ext;
        $statusFile = $this->tasksPath . $taskId . '.json';

        write_file($statusFile, json_encode([
            'total' => 100000,
            'exported' => 0,
            'message' => 'Export starting...',
            'complete' => false,
            'file' => $filename,
            'type' => $type
        ]));

        // Create blank for CSV to be appended later
        if ($type === 'csv') {
            file_put_contents($filename, "ID,Name,Price\n");
        }

        shell_exec("php spark export:run $taskId > /dev/null 2>&1 &");

        return $this->response->setJSON(['task_id' => $taskId]);
    }

    public function status()
    {
        $taskId = $this->request->getGet('task_id');
        $statusFile = $this->tasksPath . $taskId . '.json';

        if (!file_exists($statusFile)) {
            return $this->response->setJSON(['message' => 'Task not found', 'percent' => 0]);
        }

        $status = json_decode(file_get_contents($statusFile), true);
        $percent = $status['total'] > 0 ? round($status['exported'] / $status['total'] * 100) : 0;
        $status['percent'] = $percent;

        return $this->response->setJSON($status);
    }

    public function download()
    {
        $taskId = $this->request->getGet('task_id');
        $statusFile = $this->tasksPath . $taskId . '.json';

        if (!file_exists($statusFile)) {
            return $this->response->setStatusCode(404)->setBody('Export file not found');
        }

        $status = json_decode(file_get_contents($statusFile), true);
        return $this->response->download($status['file'], null);
    }

    public function cancel()
    {
        $taskId = $this->request->getGet('task_id');
        @unlink($this->tasksPath . $taskId . '.json');
        @unlink(glob($this->tasksPath . $taskId . '.*')[0] ?? '');
        return $this->response->setJSON(['cancelled' => true]);
    }
}
