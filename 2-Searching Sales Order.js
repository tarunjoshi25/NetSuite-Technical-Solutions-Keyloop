//Scenario 2- You have a saved search that finds all Sales Orders in the last 30 days where status is "Pending Approval" and the total is greater than £10,000.
//Write the SuiteScript 2.1 search.create code that retrieves this list.
//Optimise the code so that it can handle 20,000+ results without hitting governance limits.

//The below code is mentioned with an proper optimization as much as I can-
//Things which are inside this script- 

//1- I have used here pageSized 4000 for Maximized to reduce number of pages & governance impact.
//2- Uses search.Type.CURRENCY to look it up (no hardcoding here I have done).
//3- The below script is fully compatible for NetSuite as we all know some of the JS methods we cannot use in NetSuite due to its limitation out of the box we cannot go in NetSuie.

/**
 * Script: Find Sales Orders Pending Approval Above £10,000 in Last 30 Days
 * Author: Tarun Joshi
 * @NApiVersion 2.1
 */

define(['N/search', 'N/log', 'N/runtime'], function (search, log, runtime) {

    const LOG_EACH_PAGE = true; // Define flag to toggle per-page logs.
    const GOVERNANCE_THRESHOLD = 100; // Minimum safe units to continue processing
    
    /**
     * Main function to fetch Sales Orders pending approval above £10,000 in the last 30 days
     * Handles large result sets efficiently using pageSize of 4000
     * @returns {Array} results - list of matching sales orders
     */
    function getPendingApprovalSalesOrders() {
        var results = []; // Empty array I have created here to store matching records

        try {
            log.debug('Script Start', 'Starting Sales Order search for Pending Approval > £10,000');

            //Date Range Setup mentioned in below code.

            var today = new Date(); // Current date
            var past30Days = new Date(); // Date 30 days ago
            past30Days.setDate(today.getDate() - 30);

            // Format dates to MM/DD/YYYY for NetSuite filters

            var fromDate = formatDate(past30Days);
            var toDate = formatDate(today);
            log.debug('Date Range', 'From: ' + fromDate + ', To: ' + toDate);

            //Dynamic GBP Currency ID Fetch
            var currencyId = getCurrencyInternalId('GBP');
            if (!currencyId) {
                log.error('Currency Error', 'GBP currency not found in system.');
                return []; //Empty array
            }
            log.debug('Currency ID', 'Internal ID for GBP: ' + currencyId);

            // Below I have started the saved seacrh creation process manually in code itself as per requirement I am not loading the Saved search

            var soSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ['status', 'anyof', 'SalesOrd:A'], // Sales Order Status: Pending Approval
                    'AND',
                    ['trandate', 'within', fromDate, toDate], // Date within last 30 days
                    'AND',
                    ['total', 'greaterthan', 10000], // Total amount > £10,000
                    'AND',
                    ['currency', 'anyof', currencyId] // Currency is GBP
                ],
                columns: [
                    'tranid',      // Sales Order Number
                    'entity',      // Customer Name
                    'trandate',    // Transaction Date
                    'status',      // Status
                    'total',       // Order Total
                    'currency'     // Currency
                ]
            });

            // Run paged search with pageSize 4000 to handle large result sets efficiently (20,000+ records).
            //Note:4000 is max safe value (NetSuite may not return more per page), please don’t go above this.


            var pagedResults = soSearch.runPaged({ pageSize: 4000 });
            log.debug('Total Pages', pagedResults.pageRanges.length + ' page(s) found.');

            //In below code Loop(iterate) through each page

            pagedResults.pageRanges.forEach(function (pageRange) {
                var page = pagedResults.fetch({ index: pageRange.index });
                if (LOG_EACH_PAGE) { //This if condition flag I have used here because if in case in future the pages increases.
                log.debug('Processing Page', 'Index: ' + pageRange.index + ', Records: ' + page.data.length);
                }
                // Process each result in the page

                page.data.forEach(function (result) {

                // Governance usage check
                var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                if (remainingUsage < GOVERNANCE_THRESHOLD) {
                    log.warning('Low Governance Usage', 'Remaining usage: ' + remainingUsage + ' units. Stopping execution.');
                    return; // Exit the current page's loop early
                }
            
                var row = {
                    id: result.id,
                    tranid: result.getValue('tranid'),
                    customer: result.getText('entity'),
                    trandate: result.getValue('trandate'),
                    status: result.getText('status'),
                    total: parseFloat(result.getValue('total')),
                    currency: result.getText('currency')
                };
            
                results.push(row);
            });

            });

            //Below we are logging final results logs

            log.audit('Search Complete', 'Total Sales Orders Found: ' + results.length);

        } catch (e) {
            log.error('Search Error', {
            message: e.message || e.toString(),
            stack: e.stack
    });

        }
        return results; // Return all matched records
    }

    /**
     * Format a Date object into MM/DD/YYYY string for NetSuite filters
     * @param {Date} date 
     * @returns {string}
     */
    function formatDate(date) {
        if (!date || Object.prototype.toString.call(date) !== '[object Date]') { //Adding check for invalid date input.
        log.error('Invalid Date Passed to formatDate()', date); //Debug log
        return '';
    }
        var mm = date.getMonth() + 1; // Month (0-based, so +1 to get 1-12)
        var dd = date.getDate();      // Day of the month (1-31)
        var yyyy = date.getFullYear(); // Full 4-digit year (e.g., 2025)
        if (mm < 10) mm = '0' + mm;   // Pad month with '0' if less than 10 (e.g., 08)
        if (dd < 10) dd = '0' + dd;   // Pad day with '0' if less than 10 (e.g., 03)
        return mm + '/' + dd + '/' + yyyy; // Return formatted date as MM/DD/YYYY
    }

    /**
     * Dynamically retrieves the internal ID of a currency by its code (e.g., 'GBP')
     * @param {string} currencyCode 
     * @returns {number|null} internalId
     */
    function getCurrencyInternalId(currencyCode) {
        var currencyId = null;

        try {
            var currencySearch = search.create({
                type: search.Type.CURRENCY,
                filters: [['name', 'is', currencyCode]], //name is the way to filter the currency.
                columns: ['internalid']
            });

            var results = currencySearch.run().getRange({ start: 0, end: 1 });

            if (results.length > 0) {
                currencyId = parseInt(results[0].getValue('internalid'), 10);
            }

        } catch (e) {
            log.error('Currency Lookup Failed', e.toString());
        }

        return currencyId;
    }

    return {
       getPendingApprovalSalesOrders: getPendingApprovalSalesOrders
    };

});

//The above mentioned script I can use in the below mentioned scripts as per the business requirement-
//1- In Scheduled Script we can use easily the above script and automate it as per business needs and here we can use the Email module also to send the data to the other Business users.

//2- RestLet script we can right for above code if any business user say that we need your NetSuite data for the external tool then we can transfer it in JSON format and get method we use here once we deploy this in NetSuite then we can share the External URL with third party tool members and they can check the data from there end. PostMan is the tool they can use to see the data .

//3- Suitelet and Map reduce script also we can create with above code.


