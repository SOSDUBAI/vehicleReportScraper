const express = require("express");
const startScraping = require('./scraper');

const app = express();

const port = process.env.PORT || "8000";

app.get("/:VIN", async (req, res) => {

    try {
        const requestedVinNumber = req.params.VIN;

        if (!(requestedVinNumber === 'robots.txt' || requestedVinNumber === 'favicon.ico')) {

            start = Date.now();

            let data = await startScraping(req.params.VIN);
            res.status(200).send(data);
            console.log(`--------- The task is successfully finished with ${(Date.now() - start) / 1000} seconds ---------`);
            
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error')        
    }

});


app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});