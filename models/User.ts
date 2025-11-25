import mongoose, { Schema, model, models } from "mongoose";

const DocumentSchema = new Schema({
  fileName: String,
  fileType: String,
  fileUrl: String,
});

const UserSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    dob: String,
    residential: {
      street1: String,
      street2: String,
    },
    permanent: {
      street1: String,
      street2: String,
    },
    sameAsResidential: Boolean,
    documents: [DocumentSchema],
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
