<?php

return [
    /*
     * Before a POS bill is saved: the cashier's counter is required, and (Sales Customisation > Require Cash
     * Opening before billing) that counter's cash must be opened. Always on; the test suite switches it off so
     * older checkout tests need no counter or cash session (tests that cover these checks switch it back on).
     */
    'billing_checks' => (bool) env('POS_BILLING_CHECKS', true),
];
