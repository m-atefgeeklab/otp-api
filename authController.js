const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const { catchError } = require("../middlewares/catchErrorMiddleware");
const createToken = require("../utils/createToken");

exports.signInController = catchError(
  asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(new ApiError("User not found", 404));

    if (!user.verifyEmail)
      return next(new ApiError("Please verify your email", 400));

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect)
      return next(new ApiError("Invalid email or password", 401));

    // 2- Generate token
    const token = createToken(user);

    res.status(200).json({ message: "Login successful", token });
  })
);