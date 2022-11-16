<template>
  <div class="container text-center">
    <div class="row" style="font-size: 20px;">
      <h1>{{this.name}}</h1>
      <p>Address: {{$route.params.address}}</p>
      <p><a :href="`https://zksync2-testnet.zkscan.io/address/${$route.params.address}`" target="_blank">View on Explorer</a></p>
      <p>{{this.description}}</p>
      <p>Campaign Manager: <b><u>{{this.owner}}</u></b></p>
      <p>Target: <b><u>${{this.currentAmount}}</u> / ${{this.target}}</b></p>
      <p>Ends on <b><u>{{this.closeDate}}</u></b></p>
    </div>
    <div class="row" style="border: 1px solid black; padding: 15px 0px 0px 0px;">
      <div class="balance" v-if="selectedToken">
        <p>ETH Balance: <span v-if="retreivingBalance">Loading...</span>
        <span v-else>{{currentEthBalance}} ETH</span></p>
        <p>Token Balance: <span v-if="retreivingBalance">Loading...</span>
        <span v-else>{{currentBalance}} {{selectedToken.symbol}}</span></p>
        <p>Pay Gas with ETH<input type="checkbox" v-model="payWithETH" v-on:change="updateFee"></p>
        <p><span>Gas fee: {{currentFee}} {{feeSymbol}}</span> 
        </p>
      </div>
      <div class="input-group mb-3">
        <input type="number" class="form-control" placeholder="Donate Amount" aria-label="Recipient's username" aria-describedby="button-addon2" v-model="donateAmt">
        <button class="btn btn-outline-danger" type="button" id="button-addon2" v-on:click="donate" :disabled="donateAmt === ''">
          <span v-if="selectedToken && !txStatus" >Donate</span>
          <span v-else-if="txStatus == 1">Sending tx...</span>
          <span v-else-if="txStatus == 2">Waiting until tx is committed...</span>
          <span v-else-if="txStatus == 3">Updating the page...</span>
        </button>
      </div>
      <div class="input-group mb-3" v-if="this.owner == this.user">
        <input type="text" class="form-control" placeholder="Address" aria-label="Username" v-model="payoutAddress">
        <input type="number" class="form-control" placeholder="Payout Amount" aria-label="Recipient's username" aria-describedby="button-addon2" v-model="paymentAmt">
        <button class="btn btn-outline-danger" type="button" id="button-addon2" v-on:click="payout" :disabled="paymentAmt === ''">
          <span v-if="selectedToken && !txStatus" >Payout</span>
          <span v-else-if="txStatus == 1">Sending tx...</span>
          <span v-else-if="txStatus == 2">Waiting until tx is committed...</span>
          <span v-else-if="txStatus == 3">Updating the page...</span>
        </button>
      </div>
    </div>
    <div class="row" style="margin-top: 10px;" v-for="(transaction, index) in transactions" v-bind:key="index">
      <div class="card">
        <div class="card-header">
          {{transaction.type}}
        </div>
        <div class="card-body">
          <h5 class="card-title" v-if="transaction.type == 'Donation'"><b>{{transaction.donor}}</b> donated <b>{{transaction.amount/100}}</b> CToken on <u>{{transaction.date}}</u></h5>
          <h5 v-else>{{transaction.donor}} paid <b>{{transaction.receiver}}</b> <b>{{transaction.amount/100}}</b> CToken on <u>{{transaction.date}}</u></h5>
          <a :href="`https://zksync2-testnet.zkscan.io/tx/${transaction.transaction}`" target="_blank" class="btn btn-primary">View on Explorer</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { Contract, Web3Provider, Provider, utils  } from "zksync-web3";
  import { ethers } from "ethers";
  const ETH_L1_ADDRESS = "0x0000000000000000000000000000000000000000";
  const COMPAIGN_CONTRACT_ABI = require("../resource/campaignABI.json");
  
  export default {
    name: 'MainPage',
    data() {
      return {
        name : "",
        description : "",
        owner: "",
        target: "",
        closeDate: "",
        currentAmount: "",
        donateAmt: "",
        user: "",
        paymentAmt: "",
        payoutAddress: "",
        currentFee: "",
        feeSymbol: "",
        transactions: [],
        selectedToken: {
          "address": "0xC58FB08d5CD71DBf2E499a64e9e93D3A5E1F7cF7",
          "decimals": 2,
          "name": "Charity Coin",
          "symbol": "CToken"
        },
        provider: null,
        signer: null,
        contract: null,
        currentBalance: "",
        currentEthBalance: "",
        retreivingBalance: true,
        txStatus: 0,
        payWithETH: false,
      }
    },
    mounted : async function(){
      const accounts = await window.ethereum.request({method: 'eth_accounts'});
      this.user = accounts[0];
      fetch(process.env.VUE_APP_BACKEND_URL + "campaign/" + this.$route.params.address, {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin':'*'
        }
      })
      .then((response) => response.json())
      .then((data) => {
        this.name = data.name;
        this.description = data.description
        this.owner = data.owner
        this.target = data.target
        this.closeDate = data.closeDate
      })

      fetch(process.env.VUE_APP_BACKEND_URL + "transactions/" + this.$route.params.address, {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin':'*'
        }
      })
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        this.transactions = data;
      })

      this.initializeProviderAndSigner();
    },
    methods: {
      async initializeProviderAndSigner() {
        this.provider = new Provider('https://zksync2-testnet.zksync.dev');
        // Note that we still need to get the Metamask signer
        this.signer = (new Web3Provider(window.ethereum)).getSigner();
        this.contract = new Contract(
          this.$route.params.address,
          COMPAIGN_CONTRACT_ABI,
          this.signer
        );
        this.updateBalance();
        this.updateFee();
        this.getCurrent();
      },
      async getOverrides() {
        if (this.selectedToken.address != ETH_L1_ADDRESS) {
          const paymasterAddress = "0x2D5a915dbB58843b0e88855420C09a304DdBBec6";

          const gasPrice = await this.provider.getGasPrice();
          const gasLimit = await this.contract.estimateGas.donate(this.donateAmt);
          const fee = gasPrice.mul(gasLimit);

          const paymasterParams = utils.getPaymasterParams(paymasterAddress, {
              type: 'ApprovalBased',
              token: this.selectedToken.address,
              minimalAllowance: fee,
              innerInput: new Uint8Array()
          });
          return {
              maxFeePerGas: gasPrice,
              maxPriorityFeePerGas: ethers.BigNumber.from(0),
              gasLimit,
              customData: {
                  ergsPerPubdata: utils.DEFAULT_ERGS_PER_PUBDATA_LIMIT,
                  paymasterParams
              }
          };
        }
        return {};
      },
      async payout(){
        this.txStatus = 1;
        try {
          const txHandle = await this.contract.payment(this.payoutAddress, this.paymentAmt, {});
          this.txStatus = 2;
          console.log("a")
          await new Promise(r=>setTimeout(r,2000))
          console.log("b")
          const result = await txHandle.wait();
          fetch(process.env.VUE_APP_BACKEND_URL + "transactions/" + this.$route.params.address, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin':'*'
            },
            body: JSON.stringify({
              "type" : "Payout",
              "receiver" : this.payoutAddress,
              "transaction" : result.transactionHash,
              "donor" : this.signer.provider.provider.selectedAddress,
              "amount" : this.paymentAmt,
            })
          })
          this.txStatus = 3;
          this.retreivingFee = true;
          this.retreivingBalance = true;
          // Update balance and fee
          this.currentBalance = await this.getBalance();
        } catch (e) {
          console.log("error")
          console.log(e)
        }
        this.txStatus = 0;
        this.retreivingFee = false;
        this.retreivingBalance = false;
      },
      async donate(){
        this.txStatus = 1;
        try {
          const txHandle = await this.contract.donate(this.donateAmt, {});
          this.txStatus = 2;
          console.log("a")
          await new Promise(r=>setTimeout(r,2000))
          console.log("b")
          const result = await txHandle.wait();
          fetch(process.env.VUE_APP_BACKEND_URL + "transactions/" + this.$route.params.address, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin':'*'
            },
            body: JSON.stringify({
              "type" : "Donation",
              "transaction" : result.transactionHash,
              "donor" : this.signer.provider.provider.selectedAddress,
              "amount" : this.donateAmt,
            })
          })
          this.txStatus = 3;
          this.retreivingFee = true;
          this.retreivingBalance = true;
          // Update balance and fee
          this.currentBalance = await this.getBalance();
        } catch (e) {
          console.log("error")
          console.log(e)
        }
        this.txStatus = 0;
        this.retreivingFee = false;
        this.retreivingBalance = false;
      },
      async getBalance() {
        // Getting the balance for the signer in the selected token
        const balanceInUnits = await this.signer.getBalance(this.selectedToken.address);
        // To display the number of tokens in the human-readable format, we need to format them,
        // e.g. if balanceInUnits returns 500000000000000000 wei of ETH, we want to display 0.5 ETH the user
        return ethers.utils.formatUnits(balanceInUnits, this.selectedToken.decimals);
      },
      async getEthBalance() {
        // Getting the balance for the signer in the selected token
        const balanceInUnits = await this.signer.getBalance(ETH_L1_ADDRESS);
        // To display the number of tokens in the human-readable format, we need to format them,
        // e.g. if balanceInUnits returns 500000000000000000 wei of ETH, we want to display 0.5 ETH the user
        return ethers.utils.formatUnits(balanceInUnits, 18);
      },
      async getCurrent(){
        const amt = await this.contract.getCurrentAmount();
        this.currentAmount = ethers.utils.formatUnits(parseInt(amt._hex,16),2);
      },
      async getFee() {
        // Getting the amount of gas (ergs) needed for one transaction
        const feeInGas = await this.contract.estimateGas.donate(100);
        // // Getting the gas price per one erg. For now, it is the same for all tokens.
        const gasPriceInUnits = await this.provider.getGasPrice();

        if(this.payWithETH){
          this.feeSymbol = "ETH";
          return ethers.utils.formatUnits(feeInGas.mul(gasPriceInUnits), 18);
        }else{
          this.feeSymbol = "CToken";
          return 0.01
        }
      },
      updateFee() {
        this.retreivingFee = true;
        this.getFee().then((fee) => {
          this.currentFee = fee;
        })
        .catch(e => console.log(e))
        .finally(() => {
          this.retreivingFee = false;
        });
      },
      updateBalance() {
        this.retreivingBalance = true;
        this.getBalance().then((balance) => {
          this.currentBalance = balance;
        })
        .catch(e => console.log(e))
        .finally(() => {
          this.retreivingBalance = false;
        });

        this.retreivingBalance = true;
        this.getEthBalance().then((balance) => {
          this.currentEthBalance = balance;
        })
        .catch(e => console.log(e))
        .finally(() => {
          this.retreivingBalance = false;
        });
      },
    }
  }
</script>