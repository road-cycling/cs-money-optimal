const axios = require('axios');
const totp = require('notp').totp;
const base32 = require('thirty-two');


let idToNamePrice = {};

let secondNameToPriceQty = {};

let bitskinsNameToPrice = {};

function intersect(a, b) {
    var setA = new Set(a);
    var setB = new Set(b);
    var intersection = new Set([...setA].filter(x => setB.has(x)));
    return Array.from(intersection);
  };

(async () => {

    let { data } = await axios.get('https://cs.money/js/database-skins/library-en-730.js')
    
    data = data.split('skinsBaseList[730] = ')[1]

    for (let [id, jsonBlob] of Object.entries(JSON.parse(data))) {
        idToNamePrice[id] = { name: jsonBlob['m'], sellAt: jsonBlob['a'] }
    }

    let botsInventory = await axios.get('https://cs.money/730/load_bots_inventory')

    botsInventory.data.forEach(item => {
        let name = item['o']
        let price = item['p']

        if (idToNamePrice.hasOwnProperty(name)) {
            let marketHashName = idToNamePrice[name]['name']
            let sellAt = idToNamePrice[name]['sellAt']

            if (!secondNameToPriceQty.hasOwnProperty(marketHashName)) {
                secondNameToPriceQty[marketHashName] = {
                    sellAt: sellAt,
                    items: []
                }
            }

            secondNameToPriceQty[marketHashName]['items'].push({ price: price })
        }
    })

    for (let item in secondNameToPriceQty) {
        if (secondNameToPriceQty[item]['sellAt'] < 8.00 || item.includes('(Well-Worn)')) {
            delete secondNameToPriceQty[item]
        }
    }

    console.log(Object.keys(secondNameToPriceQty).length)


    const api_key = ''
    const code = totp.gen(base32.decode(''))

    const bitskinsPricingData = await axios.get(`https://bitskins.com/api/v1/get_all_item_prices/?api_key=${api_key}&code=${code}&app_id=730`) 
    
    bitskinsPricingData.data.prices.forEach(item => {
        bitskinsNameToPrice[item.market_hash_name] = parseFloat(item.price)
    })

    const intersection = intersect(Object.keys(bitskinsNameToPrice), Object.keys(secondNameToPriceQty))

    let result = []
    intersection.forEach(name => {
        console.log(`Item is ${name}`)
        console.log(secondNameToPriceQty[name])
        console.log(`Bitskins Price ${bitskinsNameToPrice[name]}`)

        secondNameToPriceQty[name].items.forEach(listing => {
            let price = listing.price;
            
            let percentage = bitskinsNameToPrice[name] / price

            result.push({
                name: name,
                percentage: percentage,
                csMoneyPrice: price,
                bitskinsPrice: bitskinsNameToPrice[name]
            })
        })
    })

    result.sort(function(a, b) {
        if ( a.percentage == b.percentage ) return 0
        if ( a.percentage < b.percentage ) return -1
        return 1
    })

    for (let item of result) {
        console.log(item)
    }

})()
