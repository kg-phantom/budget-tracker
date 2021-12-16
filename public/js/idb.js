let db;
const request = indexedDB.open('budget_tracker', 1);

// if db version changes
request.onupgradeneeded = function(event) {
    const db = event.target.result;
    // create object store with autoIncrement primary key
    db.createObjectStore('new_transaction', { autoIncrement: true });
};

request.onsuccess = function(event) {
    // save reference to global db
    db = event.target.result;

    // check if online
    if(navigator.onLine) {
        // communicate with server...
        uploadTransaction();
    }
};

request.onerror = function(event) {
    console.log(event.target.errorCode);
};

// function for no internet connection
function saveRecord(record) {
    const transaction = db.transaction(['new_transaction'], 'readwrite');
    const transactionObjStore = transaction.objectStore('new_transaction');
    transactionObjStore.add(record);
};

// function for internet connection
function uploadTransaction() {
    const transaction = db.transaction(['new_transaction'], 'readwrite');
    const transactionObjStore = transaction.objectStore('new_transaction');
    // get all records from store
    const getAll = transactionObjStore.getAll();

    getAll.onsuccess = function() {
        // if data in indexedDB store, send it to server
        if(getAll.result.length > 0) {
            fetch('/api/transaction/bulk', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(serverResponse => {
                    if(serverResponse.message) {
                        throw new Error(serverResponse);
                    }

                    // open one more transaction
                    const transaction = db.transaction(['new_transaction'], 'readwrite');
                    const transactionObjStore = transaction.objectStore('new_transaction');
                    // clear all items in store
                    transactionObjStore.clear();

                    alert('All offline transactions have been submitted!');
                })
                .catch(err => {
                    console.log(err);
                });
        }
    };
};

// listen for app coming back online
window.addEventListener('online', uploadTransaction);