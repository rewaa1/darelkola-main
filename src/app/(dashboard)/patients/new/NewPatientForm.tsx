"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { createPatient } from "@/actions/patients";

function buildPatientSchema(messages: {
  nameMin: string;
  invalidPhone: string;
}) {
  return z.object({
    fullName: z.string().min(2, messages.nameMin),
    phoneNumber: z.string().regex(/^01[0125][0-9]{8}$/, messages.invalidPhone),
    dateOfBirth: z.date().optional(),
    sex: z.string().optional(),
    maritalStatus: z.string().optional(),
    offsprings: z.number().int().min(0).optional(),
    occupation: z.string().optional(),
    residence: z.string().optional(),
  });
}

type PatientFormData = z.infer<ReturnType<typeof buildPatientSchema>>;

export function NewPatientForm() {
  const router = useRouter();
  const t = useTranslations("newPatient");
  const tField = useTranslations("patient.fields");
  const tPh = useTranslations("patient.placeholders");
  const tSex = useTranslations("patient.sex");
  const tMarital = useTranslations("patient.marital");
  const tValidation = useTranslations("patient.validation");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);

  const patientSchema = useMemo(
    () =>
      buildPatientSchema({
        nameMin: tValidation("nameMin"),
        invalidPhone: tValidation("invalidPhone"),
      }),
    [tValidation],
  );

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      sex: undefined,
      maritalStatus: undefined,
      occupation: "",
      residence: "",
    },
  });

  const handleSubmit = async (data: PatientFormData) => {
    setIsLoading(true);
    try {
      const patient = await createPatient({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        dateOfBirth: data.dateOfBirth?.toISOString(),
        sex: data.sex,
        maritalStatus: data.maritalStatus,
        offsprings: data.offsprings,
        occupation: data.occupation,
        residence: data.residence,
      });
      toast.success(t("success"));
      router.push(`/patients/${patient.id}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("personalInformation")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tField("fullName")} *</FormLabel>
                    <FormControl>
                      <Input placeholder={tPh("enterFullName")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tField("phoneNumber")} *</FormLabel>
                    <FormControl>
                      <Input placeholder={tPh("phone")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{tField("dateOfBirth")}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value ? format(field.value, "yyyy-MM-dd") : ""
                          }
                          onChange={(e) => {
                            const date = e.target.value
                              ? new Date(e.target.value)
                              : undefined;
                            if (
                              date &&
                              !isNaN(date.getTime()) &&
                              date <= new Date()
                            ) {
                              field.onChange(date);
                            }
                          }}
                          max={format(new Date(), "yyyy-MM-dd")}
                          className="flex-1"
                        />
                      </FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            captionLayout="dropdown"
                            fromYear={1920}
                            toYear={new Date().getFullYear()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tField("sex")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={tPh("selectSex")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">{tSex("male")}</SelectItem>
                        <SelectItem value="female">{tSex("female")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tField("maritalStatus")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={tPh("selectStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">
                          {tMarital("single")}
                        </SelectItem>
                        <SelectItem value="married">
                          {tMarital("married")}
                        </SelectItem>
                        <SelectItem value="divorced">
                          {tMarital("divorced")}
                        </SelectItem>
                        <SelectItem value="widowed">
                          {tMarital("widowed")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="offsprings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tField("offsprings")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tField("occupation")}</FormLabel>
                    <FormControl>
                      <Input placeholder={tPh("enterOccupation")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="residence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tField("residence")}</FormLabel>
                    <FormControl>
                      <Input placeholder={tPh("enterCityArea")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("registering") : t("registerPatient")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
