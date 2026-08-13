<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class CI_Pagination {

    // Configuration parameters
    public $base_url = '';
    public $total_rows = 0;
    public $per_page = 10;
    public $num_links = 2;
    public $cur_page = 0;
    public $use_page_numbers = FALSE;
    public $first_link = '&lsaquo; First';
    public $next_link = '&gt;';
    public $prev_link = '&lt;';
    public $last_link = 'Last &rsaquo;';
    public $full_tag_open = '';
    public $full_tag_close = '';
    public $num_tag_open = '';
    public $num_tag_close = '';
    public $cur_tag_open = '<strong>';
    public $cur_tag_close = '</strong>';

    public function __construct($params = array())
    {
        if (count($params) > 0)
        {
            $this->initialize($params);
        }
    }

    // Initialize preferences
    public function initialize($params = array())
    {
        foreach ($params as $key => $val)
        {
            if (isset($this->$key))
            {
                $this->$key = $val;
            }
        }
        return $this;
    }

    // Generate pagination links
    public function create_links()
    {
        // Ensure base_url is set
        if ($this->total_rows == 0 OR $this->per_page == 0)
        {
            return '';
        }

        // Calculate the total number of pages
        $num_pages = (int) ceil($this->total_rows / $this->per_page);

        // If only one page exists, no need to continue
        if ($num_pages === 1)
        {
            return '';
        }

        // Determine current page
        $CI =& get_instance();
        if ($CI->uri->segment($this->uri_segment) != 0)
        {
            $this->cur_page = $CI->uri->segment($this->uri_segment);

            // Use page numbers instead of offset
            if ($this->use_page_numbers)
            {
                $this->cur_page = (int) $this->cur_page;
            }
            else
            {
                $this->cur_page = (int) ($this->cur_page / $this->per_page) + 1;
            }
        }

        // If the current page number is invalid, default to the first page
        if (!ctype_digit((string) $this->cur_page) OR $this->cur_page == 0)
        {
            $this->cur_page = 1;
        }

        // Generate pagination links...
        // Additional code for rendering the pagination links would go here

        return ''; // Return the generated links as a string
    }

}
