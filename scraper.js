const {Builder, By, Key, until} = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const chalk = require('chalk');
const cheerio = require('cheerio');

let driver;

async function sleep(time) {
    await driver.sleep(time);
}

async function getDataAboutVehicle(html){
    let data = {};
    let $ = cheerio.load(html);

    let reportTitle = $('h1').text();
    reportTitle = reportTitle.replace(/\n/g, '')
    data.reportTitle = removeSpacesAndNewLines(reportTitle);


    // Scrpaing Detailed Vehicle History
    data.detailed_vehicle_history = [];
    let details = {};

    // Get lables for detailsItem object
    let labels = $('table.Table:nth-child(2) > thead:nth-child(1) > tr:nth-child(1)').text();
    labels = labels.replace(/ /g, '');
    labels = labels.split('\n');
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (label != '') {
            details[label];
        } 
    }

    $('table.Table:nth-child(2) > tbody:nth-child(2)').find('tr').each( function(index, element) {
        let detailsItem = {...details};

        $(this).find('td').each( function(rowIndex, element){
            switch (rowIndex) {
                case 0:
                    detailsItem['Date'] = $(this).text();
                    break;
                case 1:
                    detailsItem['Mileage'] = $(this).text();
                    break;
                case 2:
                    detailsItem['Source'] = $(this).text();
                    break;
                case 3:
                    detailsItem['Details'] = $(this).text();
                    break
                default:
                    break;
                
            }            
        });
        data.detailed_vehicle_history.push(detailsItem)

    });

    // Scrpaing Historical Auctions & Incidents
    data.historical_auctions_incidents = [];
    
    $('div.VhModule:nth-child(8)').find('.AuctionsCard').each( function (index, element) {
        
        let location = $(this).find('.Auctions-price').text();
        location = location.replace(/ /g, '');
        location = location.replace(/\r?\n|\r/g, '');
        location = location.split(':');
        data.historical_auctions_incidents[location[0]] = location[1];

        let historicalAuctions = {}
        $(this).find('.Auctions-list').find('.AuctionsCard-listItem').each( function (listIndex, listElement) {
            
            let historicalAuctionsItem = {...historicalAuctions}
            let item = $(this).text();

            item = item.split(' ')
            
            if (item[0] === 'auctionCalendar'){
            
                let value = item.slice(2).join(' ').replace(/\n/g, '');
                value = removeSpacesAndNewLines(value);
                historicalAuctionsItem['Auction'] = value;

            } else if (item[0] === 'infoOutline' ){
                
                let value = item.slice(1).join(' ').replace(/\n/g, '');
                value = removeSpacesAndNewLines(value);
                historicalAuctionsItem['Auction_status'] = value;

            } else if (item[0] === 'saleCalendar' ){

                let value = item.slice(2).join(' ').replace(/\n/g, '');
                value = removeSpacesAndNewLines(value);
                historicalAuctionsItem['Sale'] = value;

            } else if (item[0] === 'speedometer' ){

                let value = item.slice(2).join(' ').replace(/\n/g, '');
                value = removeSpacesAndNewLines(value);
                historicalAuctionsItem['Mileage'] = value;

            } else {

                let value = item.slice(2).join(' ').replace(/\n/g, '');
                value = removeSpacesAndNewLines(value);
                historicalAuctionsItem[item[0]] = value;
                
            }

            historicalAuctions = {...historicalAuctionsItem};

            
        })
        data.historical_auctions_incidents.push(historicalAuctions);
        
    })

    // Scrape data from Historical Sales
    data.historical_sales = [];
    $('.Classifieds').find('.ClassifiedsCard').each( function(index, element) {
        let itemHistoricalSales = {};
        let price = $(this).find('.ClassifiedsCard-price').text();
        price = price.split('\n').join('');
        price = price.split(':');
        if (price[1]) {
            price = removeSpacesAndNewLines(price[1]);
            itemHistoricalSales['price'] = price;
        }

        
                
        let dateAndMileage = $(this).find('.ClassifiedsCard-listItem').text();
        dateAndMileage = dateAndMileage.split('\n').join('');
        dateAndMileage = dateAndMileage.split(':');

        if (dateAndMileage[2]) {
            let mileage = dateAndMileage[2];
            mileage = removeSpacesAndNewLines(mileage);
            itemHistoricalSales['milage'] = mileage.slice(1)
        }

        let date = dateAndMileage[1].split(' ');
        for (let i = 0; i < date.length; i++) {
            const element = date[i];
            if (element) {
                itemHistoricalSales['date'] = element.slice(1);
                // console.log(element)
                break;
            }
        }

        data.historical_sales.push(itemHistoricalSales);
    })

    // Scrape data about NHTSA Recalls
    data.nhtsa_recalls = [];
    $('.Recalls').find('.VhAccordionItem').each( function(index, element) {
        let item = {};
        //console.log($(this).find('.VhAccordionItem-sectionTitle').text());
        let title = $(this).find('.VhAccordionItem-sectionTitle').text().replace(/\n/g, '');
        item['title'] = removeSpacesAndNewLines(title);

        let reportItem = {...item};
        $(this).find('.Recalls-report').each( function( index, element){
            if ( index == 0 ) {
                let tmp = $(this).text().split(' ');
                reportItem['date'] = tmp[3];
            }
            else{
                let recordsArray = $(this).text().split(':');
                
                reportItem[recordsArray[0]] = recordsArray.slice(1).join('')
            }
        })
        //console.log(JSON.stringify(reportItem, null, 2));
        data.nhtsa_recalls.push(reportItem);
    })

    // Scrape data from Vehicle Specifications section
    data.vehicleSpecifications  = {};
    data.vehicleSpecifications.specifications = [];
    data.vehicleSpecifications.original_equipment = [];
    data.vehicleSpecifications.included_features = [];

    $('.VehicleSpecifications').find('.VehicleSpecifications-section').each( function (index, element){
        const itemSpecs = {}
        // first section Specifications
        if (index == 0) {
            $(this).find('.EquipmentDetails-item').each( function( index, item){
                let key = $(this).find('.EquipmentDetails-title').text().replace(/\s\s+/g, ' ');
                let value = $(this).find('.EquipmentDetails-value').text().replace((/  +/g, ' '));
                
                value = value.replace(/\n/g, '');

                let result = [];
                value = value.split(' ')
                //console.log(value)
                for (let i = 0; i < value.length; i++) {
                    const element = value[i];
                    if (element === 'undefined' || element === '') {
                        continue;
                    }
                    else result.push(element);
                }
                value = result.join(' ');
                itemSpecs[key.slice(1,-1)] = value;
            })
            data.vehicleSpecifications.specifications.push(itemSpecs);
        }
        // second section Specifications
        const originalEquipmentDetails = {}
        if (index === 1) {

            $(this).find('.OriginalEquipmentDetails-item').each( function( index, item){
                let key = $(this).find('.OriginalEquipmentDetails-title').text().replace(/\s\s+/g, ' ');
                let value = $(this).find('.OriginalEquipmentDetails-value').text().replace((/  +/g, ' '));
                
                value = value.replace(/\n/g, '');

                let result = [];
                value = value.split(' ')
                //console.log(value)
                for (let i = 0; i < value.length; i++) {
                    const element = value[i];
                    if (element === 'undefined' || element === '') {
                        continue;
                    }
                    else result.push(element);
                }
                value = result.join(' ');


                originalEquipmentDetails[key.slice(1,-1)] = value;
            })
            data.vehicleSpecifications.original_equipment.push(originalEquipmentDetails);
        }

        // third section Included Features
        const includedFeatures = []
        if (index === 2) {
            $(this).find('li').each( function(index, element){
                includedFeatures.push($(this).text())
            })
            data.vehicleSpecifications.included_features = includedFeatures;
        }

        // third section Safety Ratings
        const safetyRatings = []
        if (index === 3) {
            // cant retrieve safety ratings for each vehicle
        }

    })

    //console.log(chalk.green(JSON.stringify(data, null, 2)));
    return data;
}

function removeSpacesAndNewLines(string){
    let array = string.split(' ');
    let result = [];

    for (let i = 0; i < array.length; i++) {
        const element = array[i];
        if (element === '\n' || element === '') {
            continue;
        }
        else result.push(element);
    }

    return result.join(' ')
}

module.exports = async function start(VIN) {
    try {
        console.log(chalk.green("-------- Starting browser ---------"));

        const initURL = 'https://www.vehiclehistory.com/'
        


        options = new firefox.Options();
        options = options.headless();
        
        driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();
        await driver.get(initURL);
        await sleep(500);
        await driver.findElement(By.css('button.VhButton--primary')).click();
        await sleep(500);
        await driver.findElement(By.css('.VhInput-textField')).sendKeys(VIN);
        await driver.findElement(By.css('.VhInput-textField')).sendKeys(' ');
        await sleep(500);
    
        await driver.findElement(By.id('input-1')).click;
        await driver.findElement(By.css('.HomeSearch-validVIN')).click();
    
        let currentURL = await driver.getCurrentUrl();
    
        console.log(chalk.green(`-------- Successfully load ${currentURL} ---------`));
        await driver.sleep(500);
        await driver.findElement(By.css('button.VhButton--primary')).click();
        await driver.sleep(1000);
    
        let htmlBody = await driver.getPageSource();
    
        console.log(chalk.green(`-------- HTML Dom was successfully retrived ---------`));

        await driver.close();

        console.log(chalk.green(`-------- Browser was successfully closed! ---------`));
        return await getDataAboutVehicle(htmlBody)

    } catch (error) {
        console.log(chalk.red(`-------- CRASH! ---------`));
        console.log(error)
        await driver.close();
    }
}


//start('1N4AA6AP4JC367862');