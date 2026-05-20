from web3 import Web3
from typing import Optional

from app.config import AgentConfig


class Web3Tools:
    """封装链上工具调用：读余额、编码交易、估 Gas、Faucet"""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(config.contract_address),
            abi=config.contract_abi,
        )

    def is_connected(self) -> bool:
        return self.w3.is_connected()

    def read_balance(self, address: str) -> int:
        checksum = Web3.to_checksum_address(address)
        return self.contract.functions.balanceOf(checksum).call()

    def read_decimals(self) -> int:
        return self.contract.functions.decimals().call()

    def read_symbol(self) -> str:
        return self.contract.functions.symbol().call()

    def read_total_supply(self) -> int:
        return self.contract.functions.totalSupply().call()

    def encode_transfer(self, to: str, amount_wei: int) -> str:
        checksum = Web3.to_checksum_address(to)
        return self.contract.encode_abi("transfer", args=[checksum, amount_wei])

    def estimate_gas(self, from_address: str, to: str, data: str) -> int:
        tx = {
            "from": Web3.to_checksum_address(from_address),
            "to": Web3.to_checksum_address(to),
            "data": data,
        }
        return self.w3.eth.estimate_gas(tx)

    def send_faucet(self, to: str, private_key: str) -> str:
        from eth_account import Account
        checksum = Web3.to_checksum_address(to)
        deployer = Account.from_key(private_key)
        tx = self.contract.functions.faucet().build_transaction({
            "from": deployer.address,
            "nonce": self.w3.eth.get_transaction_count(deployer.address),
            "gas": 100000,
            "gasPrice": self.w3.eth.gas_price,
        })
        signed = deployer.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        return tx_hash.hex()
