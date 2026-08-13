<?php

namespace App\Controllers;

use App\Models\LogModel;
use CodeIgniter\Controller;

class LogController extends BaseController
{
    protected $logModel;

    public function __construct()
    {
        helper(['form', 'url']);
        $this->logModel = new LogModel();
    }

    // View all logs
    public function viewAll()
    {
        $logs = $this->logModel->findAll();
        return view('log/viewall', ['logs' => $logs]);
    }

    // View a single log
    public function view($id)
    {
        $log = $this->logModel->find($id);

        if (!$log) {
            return redirect()->to('/log/viewall')->with('error', 'Log not found.');
        }

        return view('log/views', ['log' => $log]);
    }

    // View for printing
    public function printView($id)
    {
        $log = $this->logModel->find($id);

        if (!$log) {
            return redirect()->to('/log/viewall')->with('error', 'Log not found.');
        }

        return view('log/viewp', ['log' => $log]);
    }

    // Edit form
    public function edit($id)
    {
        $log = $this->logModel->find($id);

        if (!$log) {
            return redirect()->to('/log/viewall')->with('error', 'Log not found.');
        }

        return view('log/edit', ['log' => $log]);
    }

    // Update action
    public function update($id)
    {
        $data = $this->request->getPost([
            'username', 'action', 'ip_address', 'created_at'
        ]);

        if (!$this->validate([
            'username'   => 'required',
            'action'     => 'required',
            'ip_address' => 'required|valid_ip',
            'created_at' => 'required'
        ])) {
            return redirect()->back()->withInput()->with('error', 'Validation failed.');
        }

        $this->logModel->update($id, $data);

        return redirect()->to('/log/viewall')->with('message', 'Log updated successfully.');
    }

    // Sync form + action
    public function sync()
    {
        if ($this->request->getMethod() === 'post') {
            $type = $this->request->getPost('sync_type');

            // Add your sync logic here...
            // e.g., sync all logs or latest logs

            return redirect()->back()->with('message', 'Sync completed.');
        }

        return view('log/sync');
    }
}
