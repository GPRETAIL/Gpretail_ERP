<?php

namespace App\Mail;

use App\Services\Reports\Scheduled\ReportTable;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Settings > Scheduler: one scheduled report, a short summary in the body and the full report attached. */
class ScheduledReportMail extends Mailable
{
    /** @param array<string, string> $files file name => path */
    public function __construct(
        public ReportTable $report,
        public string $storeName,
        public string $scheduleName,
        public string $subjectLine,
        public ?string $messageText,
        public array $files,
        public string $fromAddress,
        public string $fromName,
        public ?string $replyToAddress = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address($this->fromAddress, $this->fromName),
            replyTo: $this->replyToAddress ? [new Address($this->replyToAddress)] : [],
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.scheduled-report', with: [
            'report' => $this->report, 'storeName' => $this->storeName, 'scheduleName' => $this->scheduleName,
            'messageText' => $this->messageText, 'previewRows' => 10, 'attachments' => array_keys($this->files),
        ]);
    }

    public function attachments(): array
    {
        return array_map(fn ($name, $path) => Attachment::fromPath($path)->as($name)
            ->withMime(str_ends_with($name, '.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
            array_keys($this->files), array_values($this->files));
    }
}
