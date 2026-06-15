import { getSupplierOptions } from "@/app/actions/suppliers";
import { Select } from "@/components/ui/Select";

type SupplierSelectProps = {
  name?: string;
  label?: string;
  defaultValue?: string;
};

export async function SupplierSelect({
  name = "supplierId",
  label = "Supplier",
  defaultValue,
}: SupplierSelectProps) {
  const options = await getSupplierOptions();

  return (
    <Select
      name={name}
      label={label}
      defaultValue={defaultValue ?? ""}
      options={[
        { value: "", label: "— Select supplier —" },
        ...options.map((o) => ({ value: o.id, label: o.name })),
      ]}
    />
  );
}
