const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class LovelyLegends {
    constructor() {
        this.headers = {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
            "Content-Type": "application/json",
            "Origin": "https://play.lovely.finance",
            "Referer": "https://play.lovely.finance/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
        };
        this.config = this.loadConfig();
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    loadConfig() {
        const configPath = path.join(__dirname, 'config.json');
        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error("Không đọc được config:", error.message);
            return {
                enableCardUpgrades: true,
                maxUpgradeCost: 1000000,
            };
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async callStartAPI(initData) {
        const startUrl = "https://playback.lovely.finance/user";
        const startPayload = { initData: initData, initial: true };
        
        try {
            const startResponse = await axios.post(startUrl, startPayload, { headers: this.headers });
            if ((startResponse.status === 201 || startResponse.status === 200) && startResponse.data) {
                let returnData = startResponse.data;
                returnData.success = true;
                return returnData;
            } else {
                return { success: false, error: `Lỗi gọi api start` };
            }
        } catch (error) {
            return { success: false, error: `Lỗi gọi api start: ${error.message}` };
        }
    }

    async callCheckDailyAPI(initData) {
        const startUrl = "https://playback.lovely.finance/daily";
        const startPayload = { initData: initData };
        
        try {
            const startResponse = await axios.post(startUrl, startPayload, { headers: this.headers });
            if ((startResponse.status === 201 || startResponse.status === 200) && startResponse.data) {
                let returnData = startResponse.data;
                returnData.success = true;
                return returnData;
            } else {
                return { success: false, error: `Lỗi gọi api check daily` };
            }
        } catch (error) {
            return { success: false, error: `Lỗi gọi api check daily: ${error.message}` };
        }
    }

    async callTapAPI(initData, tapCount) {
        const tapUrl = `https://playback.lovely.finance/tap/${tapCount}`;
        const tapPayload = { initData: initData };
        
        try {
            const tapResponse = await axios.post(tapUrl, tapPayload, { headers: this.headers });
            if (tapResponse.status === 201 || tapResponse.status === 200) {
                let returnData = tapResponse.data;
                returnData.success = true;
                return returnData;
            } else {
                return { success: false, error: `Lỗi tap: ${tapResponse.status}` };
            }
        } catch (error) {
            return { success: false, error: `Lỗi tap: ${error.message}` };
        }
    }

    async callRefillAPI(initData) {
        const refillUrl = `https://playback.lovely.finance/refill-energy`;
        const refillPayload = { initData: initData };
        
        try {
            const refillResponse = await axios.post(refillUrl, refillPayload, { headers: this.headers });
            if (refillResponse.status === 201 || refillResponse.status === 200) {
                let returnData = refillResponse.data;
                returnData.success = true;
                return returnData;
            } else {
                return { success: false, error: `Lỗi refill: ${refillResponse.status}` };
            }
        } catch (error) {
            return { success: false, error: `Lỗi refill: ${error.message}` };
        }
    }

    convertNumber(number) {
        return (number / 100).toFixed(1)
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                this.headers["X-Telegram-Auth"] = data[i];
                let initData = {};

                // Step 3: Loop through each key-value pair
                data[i].split("&").forEach(pair => {
                    // Split each pair by '=' to get the key and value
                    let [key, value] = pair.split("=");

                    // Decode both the key and value
                    let decodedKey = decodeURIComponent(key);
                    let decodedValue = decodeURIComponent(value);

                    // If the decoded value is a JSON string (like in the case of 'user'), try parsing it as JSON
                    try {
                        initData[decodedKey] = JSON.parse(decodedValue);
                    } catch (error) {
                        // If it's not valid JSON, just store the decoded value as is
                        initData[decodedKey] = decodedValue;
                    }
                });

                this.log(`========== Tài khoản ${i + 1} | ${initData.user.first_name} ==========`, 'custom');

                const startResult = await this.callStartAPI(initData);
                if (startResult.success) {
                    const maxBooster = 6;
                    if (startResult.balance !== undefined) {
                        this.log(`Balance: ${this.convertNumber(startResult.balance)}`);
                        this.log(`Năng lượng: ${this.convertNumber(startResult.energy)}/${this.convertNumber(startResult.maxEnergy)}`);
                        let givenDate = new Date(startResult.lastFullEnergyBonusTimestamp * 1000);
                        let offset = 5 * 60 * 60 * 1000;  // 7 hours in milliseconds
                        let localGivenDate = new Date(givenDate.getTime() - offset);
                        this.log(`Booster: ${maxBooster - startResult.fullEnergyBonusCount}/${maxBooster} | Last used booster: ${localGivenDate.toLocaleString()}`);
                        this.log(`Coins per tap: ${this.convertNumber(startResult.earnPerTap)}`);
                        this.log(`Lợi nhuận mỗi giây: ${this.convertNumber(startResult.earnPerHour)}`);
                        let currentTimestamp = Math.floor(Date.now() / 1000);
                        if(currentTimestamp - startResult.lastDailyClaimTimestamp >= 86400)
                        {
                            const checkDailyResult = await this.callCheckDailyAPI(initData);
                            if (checkDailyResult.success) {
                                this.log(`Daily checking thành công`, 'success');
                            }
                        }
                    }

                    if (startResult.energy !== undefined) {
                        const tapResult = await this.callTapAPI(initData, startResult.energy);
                        if (tapResult.success) {
                            this.log(`Tap thành công | Năng lượng còn ${this.convertNumber(tapResult.energy)}/${this.convertNumber(tapResult.maxEnergy)} | Balance : ${this.convertNumber(tapResult.balance)} | Booster: ${maxBooster - tapResult.fullEnergyBonusCount}/${maxBooster}`, 'success');
                            let currentTimestamp = Math.floor(Date.now() / 1000);

                            let timeDifference = currentTimestamp - tapResult.lastFullEnergyBonusTimestamp;
                            let newBoosterDifference = currentTimestamp - tapResult.firstFullEnergyBonusTimestamp;

                            if (tapResult.energy <= 10 && 
                                (tapResult.fullEnergyBonusCount < maxBooster || 
                                    (tapResult.fullEnergyBonusCount == 6 && newBoosterDifference > 86400)) && 
                                timeDifference > 3600) {
                                const refillResult = await this.callRefillAPI(initData);
                                if (refillResult.success) {
                                    this.log(`Boost năng lượng thành công | Năng lượng còn ${this.convertNumber(refillResult.energy)}/${this.convertNumber(refillResult.maxEnergy)} | Booster: ${maxBooster - refillResult.fullEnergyBonusCount}/${maxBooster}`, 'success');
                                } else {
                                    this.log(tapResult.error, 'error');
                                }
                            }
                        } else {
                            this.log(tapResult.error, 'error');
                        }
                    }
                } else {
                    this.log(startResult.error, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(239);
        }
    }
}

const client = new LovelyLegends();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});