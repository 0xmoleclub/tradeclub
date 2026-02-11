// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {PredictionMarket} from "../contracts/PredictionMarket.sol";

contract MockUSDC {
    string public name = "MockUSDC";
    string public symbol = "mUSDC";
    uint8 public decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "allowance");
        allowance[from][msg.sender] = currentAllowance - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

contract MockMatchSettlement {
    bool public finalized;
    uint8 public outcome;

    function setOutcome(bool finalized_, uint8 outcome_) external {
        finalized = finalized_;
        outcome = outcome_;
    }

    function getOutcome(bytes32) external view returns (bool, uint8) {
        return (finalized, outcome);
    }
}

contract PredictionMarketTest is Test {
    uint256 private constant ONE_SHARE = 1e18;
    uint256 private constant B_SCORE = 10e18;

    address private trader = address(0xBEEF);
    address private feeCollector = address(0xFEE1);

    MockUSDC private usdc;
    MockMatchSettlement private settlement;

    function setUp() public {
        usdc = new MockUSDC();
        settlement = new MockMatchSettlement();
    }

    function _deployMarket(uint16 feeBps) internal returns (PredictionMarket) {
        PredictionMarket market = new PredictionMarket();
        PredictionMarket.MarketConfig memory config = PredictionMarket.MarketConfig({
            matchId: keccak256("match-1"),
            usdc: address(usdc),
            matchSettlement: address(settlement),
            feeCollector: feeCollector,
            feeBps: feeBps,
            bScore: B_SCORE,
            outcomesCount: 2
        });
        market.initialize(config);
        return market;
    }

    function _approveMarket(PredictionMarket market) internal {
        vm.prank(trader);
        usdc.approve(address(market), type(uint256).max);
    }

    function testPriceEqualAtStart() public {
        PredictionMarket market = _deployMarket(0);
        uint256 price0 = market.price(0);
        uint256 price1 = market.price(1);
        assertEq(price0, 0.5e18);
        assertEq(price1, 0.5e18);
    }

    function testBuyUpdatesSharesAndPrice() public {
        PredictionMarket market = _deployMarket(0);
        usdc.mint(trader, 10_000_000); // 10 USDC
        _approveMarket(market);

        (uint256 costUsdc, uint256 feeUsdc) = market.quoteBuy(0, ONE_SHARE);
        vm.prank(trader);
        market.buy(0, ONE_SHARE, costUsdc + feeUsdc);

        assertEq(market.shares(trader, 0), ONE_SHARE);
        assertEq(market.totalShares(0), ONE_SHARE);
        assertEq(market.totalShares(1), 0);

        uint256 price0 = market.price(0);
        uint256 price1 = market.price(1);
        assertGt(price0, price1);
    }

    function testBuyChargesFee() public {
        PredictionMarket market = _deployMarket(100); // 1%
        usdc.mint(trader, 10_000_000); // 10 USDC
        _approveMarket(market);

        (uint256 costUsdc, uint256 feeUsdc) = market.quoteBuy(0, ONE_SHARE);
        uint256 balanceBefore = usdc.balanceOf(trader);

        vm.prank(trader);
        market.buy(0, ONE_SHARE, costUsdc + feeUsdc);

        uint256 balanceAfter = usdc.balanceOf(trader);
        assertEq(balanceBefore - balanceAfter, costUsdc + feeUsdc);
        assertEq(usdc.balanceOf(feeCollector), feeUsdc);
    }

    function testBuySellRoundTripNoFee() public {
        PredictionMarket market = _deployMarket(0);
        usdc.mint(trader, 10_000_000); // 10 USDC
        _approveMarket(market);

        (uint256 costUsdc, ) = market.quoteBuy(0, ONE_SHARE);
        vm.prank(trader);
        market.buy(0, ONE_SHARE, costUsdc);

        (uint256 proceedsUsdc, ) = market.quoteSell(0, ONE_SHARE);
        vm.prank(trader);
        market.sell(0, ONE_SHARE, proceedsUsdc);

        assertEq(market.shares(trader, 0), 0);
        assertEq(market.totalShares(0), 0);
        assertEq(market.totalShares(1), 0);
        assertGe(costUsdc, proceedsUsdc);
        assertLe(costUsdc - proceedsUsdc, 1);
    }

    function testBuySlippageReverts() public {
        PredictionMarket market = _deployMarket(0);
        usdc.mint(trader, 10_000_000); // 10 USDC
        _approveMarket(market);

        (uint256 costUsdc, uint256 feeUsdc) = market.quoteBuy(0, ONE_SHARE);
        vm.prank(trader);
        vm.expectRevert(PredictionMarket.Slippage.selector);
        market.buy(0, ONE_SHARE, costUsdc + feeUsdc - 1);
    }

    function testQuoteSellInsufficientLiquidityReverts() public {
        PredictionMarket market = _deployMarket(0);
        vm.expectRevert(PredictionMarket.InsufficientLiquidity.selector);
        market.quoteSell(0, ONE_SHARE);
    }
}
