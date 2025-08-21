//Scenario 3- A workflow action script is failing with the error SSS_MISSING_REQD_ARGUMENT when trying to set the entity field on an Invoice. The script looks like this:

record.submitFields({
    type: record.Type.INVOICE,
    id: 12345,
    values: { entity: 'ABC123' }
});

//Please advise why this script is failing.

//.......................................................................................................................................................................

//Answer is mentioned below-

//The above Script is failing because in entity we used the string . We need to change it from string to Number as entity is in numeric format as it is an id of customer/clients.

//Below is the correct format of above code-

record.submitFields({
    type: record.Type.INVOICE,
    id: 12345,
    values: { entity: 20934 }// 20934 is the internal ID of the customer/client.
});

