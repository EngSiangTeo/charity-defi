<template>
  <div id="app" class="container text-center" v-if="!mainLoading">
    <h1> Create New Campaign</h1>
    <p><a href="https://explorer.zksync.io/address/0xb10f1e3c07b757dffdf273526a08ed7b5805548d#transactions" target="_blank">View on Explorer</a></p>
    <div class="main-box w-50 mx-auto">
      <div>
        Select token: <select class="form-select" v-model="selectedTokenAddress" v-on:change="changeToken" disabled>
          <option v-for="token in tokens" v-bind:value="token.address" v-bind:key="token.address" >
            {{ token.symbol }}
          </option>
        </select>
      </div>
      <div class="balance" v-if="selectedToken">
        <p>ETH Balance: <span v-if="retreivingBalance">Loading...</span>
        <span v-else>{{currentEthBalance}} ETH</span></p>
        <p>Token Balance: <span v-if="retreivingBalance">Loading...</span>
        <span v-else>{{currentBalance}} {{selectedToken.symbol}}</span></p>
        <p>Gas fee: <span v-if="retreivingFee">Loading...</span>
        <span v-else>{{currentFee}} {{selectedToken.symbol}}</span>
        </p>
      </div>
      <div class="greeting-input">
        <div class="input-group mb-3">
          <span class="input-group-text" id="basic-addon1">Campaign Name</span>
          <input v-model="campaignName" class="form-control" :disabled="!selectedToken || txStatus!=0">
        </div>
        <div class="input-group mb-3">
          <span class="input-group-text" id="basic-addon1">Target Amount ($)</span>
          <input type="number" class="form-control" v-model="targetAmount" :disabled="!selectedToken || txStatus!=0" ><br/>
        </div>
        <div class="input-group mb-3">
          <span class="input-group-text" id="basic-addon1">Close Date</span>
          <input type="date" class="form-control" v-model="closeDate" :disabled="!selectedToken || txStatus!=0" placeholder="Close Date" ><br/>
        </div>
        <div class="form-floating">
          <textarea class="form-control" placeholder="Leave a comment here" v-model="campaignDesc" id="floatingTextarea" style="height: 100px"></textarea>
          <label for="floatingTextarea">Description</label>
        </div>
        <button class="btn btn-primary" :disabled="!selectedToken || txStatus!=0 || retreivingFee" v-on:click="createCampaign" style="margin-top: 10px;">
          <span v-if="selectedToken && !txStatus">Create Campaign</span>
          <span v-else-if="!selectedToken">Select token to pay fee first</span>
          <span v-else-if="txStatus == 1">Sending tx...</span>
          <span v-else-if="txStatus == 2">Waiting until tx is committed...</span>
          <span v-else-if="txStatus == 3">Updating the page...</span>
          <span v-else-if="retreivingFee">Updating the fee...</span>
        </button>
      </div>
    </div>
    <table class="table table-primary table-striped" style="margin-top: 10px;">
      <thead>
      <tr>
        <th>Address</th>
        <th>Name</th>
        <th>Owner</th>
        <th>Action</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(campaign, campaignAddress) in currentCampaigns" v-bind:key="campaignAddress">
        <td><a :href="`https://zksync2-testnet.zkscan.io/address/${campaignAddress}`" target="_blank">{{campaignAddress}}</a></td>
        <td>{{campaign.name}}</td>
        <td>{{campaign.owner}}</td>
        <td><a :href="`home/${campaignAddress}`">View</a></td>
      </tr>
      </tbody>
    </table>
  </div>
  <div id="app" class="container text-center" v-else>
    <div class="jumbotron">
      <h1 class="display-4">Welcome to Charity DApp!</h1>
      <button class="btn btn-primary" v-on:click="connectMetamask">Connect Metamask</button>
    </div>
  </div>
</template>

<script>
import { Contract, Web3Provider, Provider, utils } from "zksync-web3";
import { ethers } from "ethers";
import moment from "moment";

// eslint-disable-next-line
const GREETER_CONTRACT_ADDRESS = '0xB10F1e3c07B757dfFDf273526a08ed7B5805548d';
// eslint-disable-next-line
const GREETER_CONTRACT_ABI = require("../resource/abi.json");

const ETH_L1_ADDRESS = "0x0000000000000000000000000000000000000000";
const allowedTokens = require("../resource/eth.json");

const CHARITY_TOKEN_ADDRESS = "0xC58FB08d5CD71DBf2E499a64e9e93D3A5E1F7cF7";

export default {
  name: 'MainPage',
  data() {
    return {
      campaignName: "",
      targetAmount: "",
      closeDate: "",
      campaignDesc: "",
      currentCampaigns: {},
      tokens: allowedTokens,
      selectedToken: null,
      selectedTokenAddress: CHARITY_TOKEN_ADDRESS,
      mainLoading: true,
      provider: null,
      signer: null,
      contract: null,
      canSubmit: true,
      // 0 stands for no status, i.e no tx has been sent
      // 1 stands for tx is beeing submitted to the operator
      // 2 stands for tx awaiting commit
      // 3 stands for updating the balance and greeting on the page
      txStatus: 0,
      retreivingFee: false,
      retreivingBalance: false,
      currentBalance: "",
      currentEthBalance: "",
      currentFee: ""
    }
  },
  computed : {
    unixDate() {
      return moment(this.closeDate).format('x');
    }
  },
  mounted : async function(){
    const accounts = await window.ethereum.request({method: 'eth_accounts'});
    console.log(accounts)
    if(accounts.length > 0){
      this.loadMainScreen();
    }
    
    fetch(process.env.VUE_APP_BACKEND_URL + "campaigns", {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin':'*'
      }
    })
    .then((response) => response.json())
    .then((data)=>{
      this.currentCampaigns = data;
    })
  },
  methods: {
    async initializeProviderAndSigner() {
      this.provider = new Provider('https://zksync2-testnet.zksync.dev');
      // Note that we still need to get the Metamask signer
      this.signer = (new Web3Provider(window.ethereum)).getSigner();
      this.contract = new Contract(
        GREETER_CONTRACT_ADDRESS,
        GREETER_CONTRACT_ABI,
        this.signer
      );
      this.changeToken();
    },
    async getFee() {
      // Getting the amount of gas (ergs) needed for one transaction
      // const feeInGas = await this.contract.estimateGas.newCampaign(this.campaignName,this.targetAmount,this.unixDate);
      // // Getting the gas price per one erg. For now, it is the same for all tokens.
      // const gasPriceInUnits = await this.provider.getGasPrice();
      // To display the number of tokens in the human-readable format, we need to format them,
      // e.g. if feeInGas*gasPriceInUnits returns 500000000000000000 wei of ETH, we want to display 0.5 ETH the user
      // if (this.selectedToken.l1Address == CHARITY_TOKEN_ADDRESS){
        return 0.01;
      // }
      // return ethers.utils.formatUnits(feeInGas.mul(gasPriceInUnits), this.selectedToken.decimals);
    },
    async getBalance() {
      // Getting the balance for the signer in the selected token
      const balanceInUnits = await this.signer.getBalance(this.selectedToken.l2Address);
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
    async getOverrides() {
      if (this.selectedToken.l1Address != ETH_L1_ADDRESS) {
        const paymasterAddress = "0x2D5a915dbB58843b0e88855420C09a304DdBBec6";

        const gasPrice = await this.provider.getGasPrice();
        const gasLimit = await this.contract.estimateGas.newCampaign(this.campaignName,this.targetAmount,this.unixDate);
        const fee = gasPrice.mul(gasLimit);

        const paymasterParams = utils.getPaymasterParams(paymasterAddress, {
            type: 'ApprovalBased',
            token: this.selectedToken.l2Address,
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
    async createCampaign() {
      this.txStatus = 1;
      try {
        const txHandle = await this.contract.newCampaign(this.campaignName,this.targetAmount,this.unixDate, await this.getOverrides());
        this.txStatus = 2;
        const result = await txHandle.wait();
        for(var x of result.events){
          if(x.args?.campaign){
            fetch(process.env.VUE_APP_BACKEND_URL + "campaign", {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin':'*'
              },
              body: JSON.stringify({
                "campaignAddress" : x.args?.campaign,
                "name" : this.campaignName,
                "description" : this.campaignDesc,
                "owner" : this.signer.provider.provider.selectedAddress,
                "target" : this.targetAmount,
                "closeDate" : this.closeDate
              })
            })
          }
        }
        this.txStatus = 3;

        this.retreivingFee = true;
        this.retreivingBalance = true;
        // Update balance and fee
        this.currentBalance = await this.getBalance();
        this.currentFee = await this.getFee();
      } catch (e) {
        console.log("error")
        console.log(e)
      }
      this.txStatus = 0;
      this.retreivingFee = false;
      this.retreivingBalance = false;
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
    changeToken() {
      this.retreivingFee = true
      this.retreivingBalance = true
      const l1Token = this.tokens.filter(t => t.address == this.selectedTokenAddress)[0];
      // this.provider.l2TokenAddress(l1Token.address)
      //   .then((l2Address) => {
          this.selectedToken = { l1Address: l1Token.address, l2Address: l1Token.address, decimals: l1Token.decimals, symbol: l1Token.symbol }
          this.updateFee();
          this.updateBalance();
        // })
        // .catch(e => console.log(e))
        // .finally(() => {
            this.retreivingFee = false
            this.retreivingBalance = false
        // });
    },
    loadMainScreen() {
      this.initializeProviderAndSigner();

      if(!this.provider || !this.signer) {
        alert("Follow the tutorial to learn how to connect to Metamask!");
        return;
      }
      this.mainLoading = false;
    },  
    connectMetamask() {
      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(() => {
          if (+window.ethereum.networkVersion == 280) {
            this.loadMainScreen();
          } else {
            alert("Please switch network to zkSync!");
          }
        })
        .catch((e) => console.log(e)); 
    }
  }
}
</script>

<style>
.balance {
  margin-top: 10px;
}
</style>
