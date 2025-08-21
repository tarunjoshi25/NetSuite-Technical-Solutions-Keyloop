//1- Scenario 1-

//Write a SuiteScript 2.1 User Event Script that, when an invoice is saved, sums all line-level values in a custom column field custcol_discount_amount and writes the total to a body-level field custbody_total_discount.
//Your code should:
//Use the appropriate API for accessing sublist values.
//Avoid unnecessary record loads.
//Handle both create and edit events.

//......................................................................................................................................................................

//The below code is not hardcoded I have written it in a Dynamically way so it will work for infinite line items and I have created one hidden checkbox in Invoice which the user will not able to see it and the reason to making this is as we are using the submitfields method which is best way to right the code as it saves our governance limit but in aftersubmit if we call record.submitFields inside afterSubmit, the User Event can re‑trigger itself, causing an infinite loop.

/**
 * @NApiVersion 2.1               // Version SuiteScript 2.1
 * @NScriptType UserEventScript   // User Event script type
 */
define(['N/record', 'N/log'], (record, log) => {  // Arrow function I used here

    const DISCOUNT_COLUMN = 'custcol_discount_amount'; // ID of custom line-level discount column
    const DISCOUNT_TOTAL_BODY = 'custbody_total_discount'; // ID of body field to store total discount
    const DISCOUNT_PROCESSED_FLAG = 'custbody_discount_processed'; // Flag to prevent recursive processing
    const SUBLIST_ID = 'item'; // Standard sublist for invoice lines

    /**
     * Function that runs after the invoice record has been created or edited
     * @param {Object} context - User Event context (contains newRecord, oldRecord, type etc.)
     */
    const afterSubmit = (context) => {
        try {
            log.debug('Script Start', 'Starting afterSubmit script for Invoice');

        //Adding below in code the explicit event type check here, at start of function
        if (![context.UserEventType.CREATE, context.UserEventType.EDIT].includes(context.type)) {
            log.debug('Event Type Skipped', `Event type ${context.type} is not CREATE or EDIT. Skipping.`);
            return;
        }

            const newRecord = context.newRecord;

            // Only proceed if record type is Invoice
            
            if (newRecord.type !== record.Type.INVOICE) {
                log.debug('Not an Invoice', `Record type is ${newRecord.type}, skipping script.`);
                return;
            }

            // Get number of line items in 'item' sublist
            const lineCount = newRecord.getLineCount({ sublistId: SUBLIST_ID }); 
            let totalDiscount = 0;

            log.debug('Line Count', `Invoice has ${lineCount} line(s)`);

            // Loop through each line to calculate total discount
            for (let i = 0; i < lineCount; i++) {  // For sublist items, for-loop is commonly used
                let discountVal = newRecord.getSublistValue({
                    sublistId: SUBLIST_ID,
                    fieldId: DISCOUNT_COLUMN,
                    line: i
                });

                // Convert to Number and add to total, if present
                totalDiscount += Number(discountVal) || 0; // Converts discountVal to number and adds to totalDiscount

                log.debug(`Line ${i + 1} Discount`, `Discount Value: ${discountVal}, Running Total: ${totalDiscount}`); //Used Template literal 
            }

            // Fetch current total discount and processed flag from header
            let currentHeaderDiscount = newRecord.getValue({ fieldId: DISCOUNT_TOTAL_BODY }) || 0;
            let alreadyProcessed = newRecord.getValue({ fieldId: DISCOUNT_PROCESSED_FLAG });

            log.debug('Current Values', `Existing Header Discount: ${currentHeaderDiscount}, Already Processed: ${alreadyProcessed}`);

            // Only update if discount value has changed or it hasn't been processed yet
            if ((Number(currentHeaderDiscount) !== Number(totalDiscount)) || !alreadyProcessed) {
                let invoiceId = newRecord.id;

                // Use submitFields for lightweight update (avoids full record load)
                record.submitFields({
                    type: record.Type.INVOICE,
                    id: invoiceId,
                    values: {
                        [DISCOUNT_TOTAL_BODY]: totalDiscount,     // Set updated total discount
                        [DISCOUNT_PROCESSED_FLAG]: true           // Mark record as processed
                    },
                    options: { // These options apply when using submitFields
                        enableSourcing: false,        // Do not trigger sourcing logic
                        ignoreMandatoryFields: true   // Avoid mandatory field validation blocking update
                    }
                });

                // Log the update using template literal
                log.debug('Invoice Updated', `Invoice ID ${invoiceId} updated with total discount: ${totalDiscount}`); // Template literal used here
            } else {
                log.debug('No Update Needed', 'Discount already up to date or already processed.');
            }

        } catch (e) {
            // Log error with safe messaging
            log.error('Error in afterSubmit (Invoice Discount Totals)', e.toString());
        }
    };

    // Return User Event script entry point
    return { afterSubmit };
});

