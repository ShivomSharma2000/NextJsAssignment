"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { Plus } from "lucide-react";
import { toast } from "react-toastify";

type Document = {
  fileName: string;
  fileType: "image" | "pdf";
  file: File | null;
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  residential: { street1: string; street2: string };
  permanent: { street1: string; street2: string };
  sameAsResidential: boolean;
  documents: Document[];
};

const schema: any = yup.object({
  firstName: yup.string().required("First Name is required"),
  lastName: yup.string().required("Last Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  dob: yup
    .string()
    .required("Date of Birth is required")
    .test("valid-date", "Please enter a valid date", (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .test("not-future", "Date of birth cannot be in the future", (value) => {
      if (!value) return false;
      const birthDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return birthDate <= today;
    })
    .test("reasonable-age", "Please enter a valid date of birth", (value) => {
      if (!value) return false;
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age <= 120; // Maximum reasonable age
    })
    .test("min-age", "You must be at least 18 years old", (value) => {
      if (!value) return false;
      const today = new Date();
      const birthDate = new Date(value);
      
      // Calculate age more accurately
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      
      // Adjust age if birthday hasn't occurred this year
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }
      
      return age >= 18;
    }),
  residential: yup.object({
    street1: yup.string().required("Street 1 is required"),
    street2: yup.string().required("Street 2 is required"),
  }),
  permanent: yup.object({
    street1: yup.string().test(
      'required-when-different',
      'Street 1 is required',
      function(value) {
        const { sameAsResidential } = this.options.context || {};
        if (sameAsResidential) return true;
        return !!value;
      }
    ),
    street2: yup.string().test(
      'required-when-different',
      'Street 2 is required',
      function(value) {
        const { sameAsResidential } = this.options.context || {};
        if (sameAsResidential) return true;
        return !!value;
      }
    ),
  }),
  sameAsResidential: yup.boolean(),
  documents: yup
    .array()
    .of(
      yup.object({
        fileName: yup.string().required("File Name is required"),
        fileType: yup.mixed<"image" | "pdf">().required("File Type is required"),
        file: yup.mixed<File>().test("file-required", "File is required", function(value) {
          return value !== null && value !== undefined;
        }),
      })
    )
    .min(2, "At least 2 documents are required"),
});

export default function UserForm() {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<FormValues>({
    resolver: async (values, context, options) => {
      const result = await yupResolver(schema)(
        values as FormValues, 
        { ...context, sameAsResidential: (values as FormValues).sameAsResidential }, 
        options as any
      );
      return result as any;
    },
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dob: "",
      residential: { street1: "", street2: "" },
      permanent: { street1: "", street2: "" },
      sameAsResidential: false,
      documents: [
        { fileName: "", fileType: "image", file: null },
        { fileName: "", fileType: "image", file: null },
      ],
    },
  });

  const [loading, setLoading] = useState(false);
  const sameAsResidential = watch("sameAsResidential");
  const residential = watch("residential");

  useEffect(() => {
    if (sameAsResidential) {
      setValue("permanent", { ...residential });
    }
  }, [sameAsResidential, residential, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "documents",
  });


const onSubmit = async (data: FormValues) => {
  setLoading(true)
  try {
    // Validate each document's file with its selected fileType
    for (const doc of data.documents) {
      if (doc.file) {
        const file = doc.file;
        const selectedType = doc.fileType.toLowerCase();

        // Allowed extensions
        const isImage =
          file.type.startsWith("image/") ||
          /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);

        const isPDF =
          file.type === "application/pdf" ||
          /\.pdf$/i.test(file.name);

        // Validation Logic
        if (selectedType === "image" && !isImage) {
          alert(`❌ Invalid file type for ${doc.fileName}. Please upload an IMAGE file.`);
          return; // STOP submission
        }

        if (selectedType === "pdf" && !isPDF) {
          alert(`❌ Invalid file type for ${doc.fileName}. Please upload a PDF file.`);
          return; // STOP submission
        }
      }
    }

    // If validation passed → continue
    const formData = new FormData();

    formData.append(
      "data",
      JSON.stringify({
        ...data,
        documents: data.documents.map((doc) => ({
          fileName: doc.fileName,
          fileType: doc.fileType,
        })),
      })
    );

    // Append file blobs
    data.documents.forEach((doc) => {
      if (doc.file) {
        formData.append("files", doc.file);
      }
    });

    const res = await axios.post("/api/register", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("API Response:", res.data);

    if (res.data.success) {
      toast.success("User registered!");
      reset()
    } else {
      toast.error("Registration failed!");
    }
  } catch (error) {
  let message = "Something went wrong";

  if (axios.isAxiosError(error)) {
    message = error.response?.data?.message || message;
  }

  toast.error(message);
}
   finally {
    setLoading(false); 
  }
};


  const onError = (errors: any) => {
    console.log("Form Errors:", errors);
  };


  return (
    <form
      onSubmit={handleSubmit(onSubmit, onError)}
      className="bg-white p-6 max-w-3xl mx-auto rounded shadow-md space-y-4"
    >
      <h1 className="text-2xl font-bold text-black">User Registration Form</h1>

      {/* Personal Info */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-black mb-1">First Name</label>
          <input
            type="text"
            {...register("firstName")}
            className="w-full p-2 bg-white border border-black rounded text-black"
          />
          {errors.firstName && <p className="text-red-500 mt-1">{errors.firstName.message}</p>}
        </div>

        <div className="flex-1">
          <label className="block text-black mb-1">Last Name</label>
          <input
            type="text"
            {...register("lastName")}
            className="w-full p-2 bg-white border border-black rounded text-black"
          />
          {errors.lastName && <p className="text-red-500 mt-1">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-black mb-1">Email</label>
          <input
            type="email"
            {...register("email")}
            className="w-full p-2 bg-white border border-black rounded text-black"
          />
          {errors.email && <p className="text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div className="flex-1">
          <label className="block text-black mb-1">Date of Birth</label>
          <input
            type="date"
            {...register("dob")}
            className="w-full p-2 bg-white border border-black rounded text-black"
          />
          {errors.dob && <p className="text-red-500 mt-1">{errors.dob.message}</p>}
        </div>
      </div>

      {/* Residential Address */}
      <h2 className="font-semibold text-black">Residential Address</h2>
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Street 1"
            {...register("residential.street1")}
            className="w-full p-2 bg-white border border-black rounded text-black"
          />
          {errors.residential?.street1 && (
            <p className="text-red-500 mt-1">{errors.residential.street1.message}</p>
          )}
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Street 2"
            {...register("residential.street2")}
            className="w-full p-2 bg-white border border-black rounded text-black"
          />
          {errors.residential?.street2 && (
            <p className="text-red-500 mt-1">{errors.residential.street2.message}</p>
          )}
        </div>
      </div>

      {/* Permanent Address */}
      <label className="flex items-center space-x-2 text-black mt-2">
        <input type="checkbox" {...register("sameAsResidential")} />
        <span>Same as Residential Address</span>
      </label>

      <h2 className="font-semibold text-black mt-2">Permanent Address</h2>
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Street 1"
            {...register("permanent.street1")}
            disabled={sameAsResidential}
            className="w-full p-2 bg-white border border-black rounded text-black"
          />
          {!sameAsResidential && errors.permanent?.street1 && (
            <p className="text-red-500 mt-1">{errors.permanent.street1.message}</p>
          )}
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Street 2"
            {...register("permanent.street2")}
            disabled={sameAsResidential}
            className="w-full p-2 bg-white border border-black rounded text-black"
          />
          {!sameAsResidential && errors.permanent?.street2 && (
            <p className="text-red-500 mt-1">{errors.permanent.street2.message}</p>
          )}
        </div>
      </div>

      {/* Documents */}
      <h2 className="font-semibold text-black mt-4">Upload Documents</h2>
      {fields.map((field, index: number) => (
        <div key={field.id} className="space-y-2 border p-4 rounded relative">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-black mb-1 text-sm">File Name</label>
              <input
                type="text"
                placeholder="File Name"
                {...register(`documents.${index}.fileName` as const)}
                className="w-full p-2 bg-white border border-black rounded text-black"
              />
              {errors.documents?.[index]?.fileName && (
                <p className="text-red-500 mt-1 text-sm">{errors.documents[index]?.fileName?.message}</p>
              )}
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-black mb-1 text-sm">File Type</label>
              <select
                {...register(`documents.${index}.fileType` as const)}
                className="w-full p-2 bg-white border border-black rounded text-black"
              >
                <option value="image">Image</option>
                <option value="pdf">PDF</option>
              </select>
              {errors.documents?.[index]?.fileType && (
                <p className="text-red-500 mt-1 text-sm">{errors.documents[index]?.fileType?.message}</p>
              )}
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-black mb-1 text-sm">Upload File</label>
              <Controller
                control={control}
                name={`documents.${index}.file` as const}
                render={({ field }) => (
                  <input
                    type="file"
                    onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                    accept={watch(`documents.${index}.fileType`) === "image" ? "image/*" : "application/pdf"}
                    className="w-full p-2 bg-white border border-black rounded text-black"
                  />
                )}
              />
              {errors.documents?.[index]?.file && (
                <p className="text-red-500 mt-1 text-sm">{errors.documents[index]?.file?.message}</p>
              )}
            </div>

            {fields.length > 2 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="bg-red-500 text-white px-3 py-1 rounded h-fit mt-6"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ fileName: "", fileType: "image", file: null })}
        className="mt-2 bg-black text-white px-3 py-1 rounded"
      >
        <Plus />
      </button>

      {typeof errors.documents === 'object' && 'message' in errors.documents && errors.documents.message && (
        <p className="text-red-500 mt-1">{errors.documents.message}</p>
      )}

      {/* Submit Button */}
      <div className="mt-4 flex justify-center">
  <button
    type="submit"
    disabled={loading}
    className="bg-black text-white px-6 py-2 rounded flex items-center justify-center w-32"
  >
    {loading ? (
      <div className="animate-spin h-5 w-5 border-4 border-white border-t-transparent rounded-full"></div>
    ) : (
      "Submit"
    )}
  </button>
</div>

    </form>
  );
}