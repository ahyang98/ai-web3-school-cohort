// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Task3Token is ERC20 {
    constructor() ERC20("Task3 Token", "T3T") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function faucet() external {
        _mint(msg.sender, 100 * 10 ** decimals());
    }
}
