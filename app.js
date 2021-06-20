const express = require("express");
const path = require("path");
const startScraping = require('./scraper');

const app = express();
const port = process.env.PORT || "8000";

app.get("/:VIN", async (req, res) => {

    start = Date.now();
    let data = await startScraping(req.params.VIN);
    res.status(200).send(data);
    
    console.log((Date.now() - start) / 1000);

});


app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});