"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCompleteCart = exports.removeItemFromCart = exports.updateItemQuantity = exports.addItemToCart = exports.postCurrentCart = exports.getCartByCustomerId = void 0;
const cartModel_1 = __importDefault(require("../../models/cartModel"));
const productModel_1 = __importDefault(require("../../models/product/productModel"));
const mongoose_1 = __importDefault(require("mongoose"));
const getCartByCustomerId = async (req, res, next) => {
    try {
        const { customerId } = req.body;
        const isCart = await cartModel_1.default.find({ customer_id: customerId });
        res.status(200).json({ success: true, cart: isCart });
    }
    catch (error) {
        console.log(error);
        next(error);
        // res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCartByCustomerId = getCartByCustomerId;
const postCurrentCart = async (req, res, next) => {
    try {
        const { existingCart } = req.body;
        if (existingCart) {
            const productChoiceId = existingCart.cart_item.map((item) => item.product_choice_id);
            const cartProductItems = await productModel_1.default.aggregate([
                {
                    $unwind: '$product_choices',
                },
                {
                    $match: { 'product_choices._id': { $in: productChoiceId } },
                },
                {
                    $addFields: {
                        product_choice_id: '$product_choices._id',
                        color: '$product_choices.color',
                        size: '$product_choices.size',
                        price: '$product_choices.price',
                        image_url: {
                            $arrayElemAt: ['$product_choices.images.url', 0],
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        product_name: '$name',
                        product_choice_id: 1,
                        color: 1,
                        size: 1,
                        price: 1,
                        image_url: 1,
                    },
                },
            ]);
            const productChoice = existingCart.cart_item.map((item) => {
                const productItem = cartProductItems.find((enriched) => enriched.product_choice_id.toString() ===
                    item.product_choice_id.toString());
                return {
                    id: item.id,
                    product_choice_id: item.product_choice_id,
                    quantity: item.quantity,
                    ...productItem,
                };
            });
            const currentCart = JSON.parse(JSON.stringify({
                _id: existingCart._id,
                customer_id: existingCart.customer_id,
                status: existingCart.status,
                payment_method: existingCart.payment_method,
                payment_status: existingCart.payment_status,
                payment_timestamp: existingCart.payment_timestamp,
                total_price: existingCart.total_price,
                create_timestamp: existingCart.create_timestamp,
                last_updated_timestamp: existingCart.last_updated_timestamp,
                creator_id: existingCart.creator_id,
                last_op_id: existingCart.last_op_id,
                tram_status: existingCart.tram_status,
                cart_item: productChoice,
            }));
            res.status(200).json({ success: true, cart: currentCart });
            return;
        }
        res.status(404).json({
            success: false,
            message: 'No cart found for the current customer',
        });
    }
    catch (error) {
        console.error('Error in postCurrentCart:', error);
        next(error);
        // res.status(500).json({ success: false, message: error.message });
    }
};
exports.postCurrentCart = postCurrentCart;
const addItemToCart = async (req, res, next) => {
    try {
        const { customerId, productChoiceId, quantity, existingCart, } = req.body;
        if (!quantity) {
            res.status(400).json({
                success: false,
                message: 'Quantity is required or invalid. Please check your cart and try again.',
            });
            return;
        }
        if (existingCart) {
            const cart = await cartModel_1.default.findById(existingCart._id);
            if (!cart) {
                res.status(404).json({ success: false, message: 'Cart not found' });
                return;
            }
            const existingCartItemIndex = cart.cart_item.findIndex((item) => item.product_choice_id.toString() === productChoiceId);
            if (existingCartItemIndex > -1) {
                cart.cart_item[existingCartItemIndex].quantity += quantity;
            }
            else {
                cart.cart_item.push({
                    id: new mongoose_1.default.Types.ObjectId(),
                    product_choice_id: new mongoose_1.default.Types.ObjectId(productChoiceId),
                    quantity,
                });
            }
            cart.status = 'active';
            cart.last_updated_timestamp = new Date();
            cart.last_op_id = new mongoose_1.default.Types.ObjectId(customerId);
            await cart.save();
            res
                .status(200)
                .json({ success: true, message: 'Item added to existing cart' });
            return;
        }
        await cartModel_1.default.create({
            customer_id: customerId,
            status: 'pending',
            payment_method: 'none',
            payment_status: 'not_paid',
            cart_item: [
                {
                    id: new mongoose_1.default.Types.ObjectId(),
                    product_choice_id: new mongoose_1.default.Types.ObjectId(productChoiceId),
                    quantity,
                },
            ],
            creator_id: customerId,
            last_op_id: customerId,
        });
        res.status(201).json({
            success: true,
            message: 'Cart created successfully. Please fetch the updated cart.',
        });
    }
    catch (error) {
        console.log(error);
        next(error);
        // res.status(500).json({ success: false, message: error.message });
    }
};
exports.addItemToCart = addItemToCart;
const updateItemQuantity = async (req, res, next) => {
    try {
        const { customerId, productChoiceId, quantity, existingCart, } = req.body;
        if (!quantity) {
            res.status(400).json({
                success: false,
                message: 'Quantity is required or invalid. Please check your cart and try again.',
            });
            return;
        }
        if (existingCart) {
            const cart = await cartModel_1.default.findById(existingCart._id);
            if (!cart) {
                res.status(404).json({ success: false, message: 'Cart not found' });
                return;
            }
            const index = cart.cart_item.findIndex((item) => item.product_choice_id.toString() === productChoiceId);
            if (index === -1) {
                res.status(404).json({ success: false, message: 'Cart not found' });
                return;
            }
            if (quantity > 0) {
                cart.cart_item[index].quantity = quantity;
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'Quantity must be greater than 0',
                });
                return;
            }
            cart.last_updated_timestamp = new Date();
            cart.last_op_id = new mongoose_1.default.Types.ObjectId(customerId);
            await cart.save();
            res
                .status(200)
                .json({ success: true, message: 'Quantity updated successfully' });
            return;
        }
        res.status(404).json({ success: false, message: 'Cart not found' });
    }
    catch (error) {
        console.log(error);
        next(error);
        // res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateItemQuantity = updateItemQuantity;
const removeItemFromCart = async (req, res, next) => {
    try {
        const { customerId, productChoiceId, existingCart, } = req.body;
        if (existingCart) {
            const cart = await cartModel_1.default.findById(existingCart._id);
            if (!cart) {
                res.status(404).json({ success: false, message: 'Cart not found' });
                return;
            }
            const index = cart.cart_item.findIndex((item) => item.product_choice_id.toString() === productChoiceId);
            if (index === -1) {
                res
                    .status(404)
                    .json({ success: false, message: 'Item not found in cart' });
                return;
            }
            cart.cart_item.splice(index, 1);
            cart.last_updated_timestamp = new Date();
            cart.last_op_id = new mongoose_1.default.Types.ObjectId(customerId);
            await cart.save();
            res
                .status(200)
                .json({ success: true, message: 'Item removed from cart' });
            return;
        }
        res.status(404).json({ success: false, message: 'Cart not found' });
    }
    catch (error) {
        console.log(error);
        next(error);
        // res.status(500).json({ success: false, message: error.message });
    }
};
exports.removeItemFromCart = removeItemFromCart;
const postCompleteCart = async (req, res, next) => {
    const session = await mongoose_1.default.startSession(); // ใช้ transaction
    session.startTransaction();
    try {
        const { cartId, paymentMethod, } = req.body;
        if (!['credit_card'].includes(paymentMethod)) {
            res.status(400).json({
                success: false,
                message: 'Invalid or unsupported payment method',
            });
            return;
        }
        const cart = await cartModel_1.default.findById(cartId);
        if (!cart) {
            res.status(404).json({ success: false, message: 'Cart not found' });
            return;
        }
        if (!cart.status ||
            cart.status === 'completed' ||
            cart.status === 'cancelled') {
            res.status(400).json({
                success: false,
                message: 'Cart is not in a valid state for completion',
            });
            return;
        }
        const updatePromises = cart.cart_item.map(async (item) => {
            const productChoice = await productModel_1.default.findOneAndUpdate({ 'product_choices._id': item.product_choice_id }, { $inc: { 'product_choices.$.quantity': -item.quantity } }, { new: true, session });
            if (!productChoice) {
                res.status(404).json({
                    success: false,
                    message: `Product choice with ID ${item.product_choice_id} not found`,
                });
                return;
            }
            const updatedChoice = productChoice.product_choices.find((choice) => choice._id.toString() === item.product_choice_id.toString());
            if (updatedChoice && updatedChoice.quantity < 0) {
                res.status(400).json({
                    success: false,
                    message: `Insufficient stock for product choice ID ${item.product_choice_id}`,
                });
                return;
            }
        });
        await Promise.all(updatePromises);
        cart.status = 'completed';
        cart.payment_method = paymentMethod;
        cart.payment_status = 'paid';
        cart.payment_timestamp = new Date();
        cart.last_updated_timestamp = new Date();
        await cart.save();
        await session.commitTransaction(); // ยืนยัน transaction
        session.endSession();
        res.status(200).json({ success: true, message: 'Cart payment completed' });
    }
    catch (error) {
        await session.abortTransaction(); // ยกเลิก transaction กรณีเกิดข้อผิดพลาด
        session.endSession();
        console.log(error);
        next(error);
    }
};
exports.postCompleteCart = postCompleteCart;
