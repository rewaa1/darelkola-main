"use client";

import { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useFormatter } from "next-intl";
import { Clinic, Patient, PersonalHistory } from "@prisma/client";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogTrigger as DialogTrigger,
} from "@/components/ui/responsive-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchPatients } from "@/actions/patients";

type PatientWithHistory = Patient & {
  personalHistory: PersonalHistory | null;
};

function buildBookingSchema(messages: {
  nameMin: string;
  phoneMin: string;
  selectClinic: string;
  selectDate: string;
}) {
  return z.object({
    patientName: z.string().min(2, messages.nameMin),
    patientPhone: z.string().min(10, messages.phoneMin),
    clinicId: z.string().min(1, messages.selectClinic),
    date: z.date({ message: messages.selectDate }),
    notes: z.string().optional(),
  });
}

type BookingFormData = z.infer<ReturnType<typeof buildBookingSchema>>;

interface BookingDialogProps {
  clinics: Clinic[];
  onBook: (data: BookingFormData & { patientId?: string }) => Promise<void>;
}

export function BookingDialog({ clinics, onBook }: BookingDialogProps) {
  const t = useTranslations("booking");
  const tCommon = useTranslations("common");
  const tv = useTranslations("booking.validation");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const bookingSchema = useMemo(
    () =>
      buildBookingSchema({
        nameMin: tv("nameMin"),
        phoneMin: tv("phoneMin"),
        selectClinic: tv("selectClinic"),
        selectDate: tv("selectDate"),
      }),
    [tv],
  );

  // Patient search state
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PatientWithHistory[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      patientName: "",
      patientPhone: "",
      clinicId: clinics[0]?.id ?? "",
      date: new Date(),
      notes: "",
    },
  });

  const handlePhoneChange = (value: string) => {
    setPhoneSearch(value);
    form.setValue("patientPhone", value);
    setSelectedPatientId(null);

    // Debounced search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchPatients(value);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      }, 300);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectPatient = (patient: PatientWithHistory) => {
    const history = patient.personalHistory;
    if (history) {
      form.setValue("patientName", history.fullName);
      form.setValue("patientPhone", history.phoneNumber);
      setPhoneSearch(history.phoneNumber);
    }
    setSelectedPatientId(patient.id);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleSubmit = async (data: BookingFormData) => {
    setIsLoading(true);
    try {
      await onBook({
        ...data,
        patientId: selectedPatientId ?? undefined,
      });
      form.reset();
      setPhoneSearch("");
      setSelectedPatientId(null);
      setSearchResults([]);
      setOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      form.reset();
      setPhoneSearch("");
      setSelectedPatientId(null);
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 me-2" />
          {t("bookAppointment")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("bookAppointment")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="clinicId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("clinic")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectClinic")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number with patient search */}
            <FormField
              control={form.control}
              name="patientPhone"
              render={() => (
                <FormItem>
                  <FormLabel>{t("phoneNumber")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder={t("searchByPhoneOrName")}
                        value={phoneSearch}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onFocus={() => {
                          if (searchResults.length > 0) setShowDropdown(true);
                        }}
                        onBlur={() => {
                          // Delay to allow click on dropdown item
                          setTimeout(() => setShowDropdown(false), 200);
                        }}
                      />
                      {selectedPatientId && (
                        <UserCheck className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      )}
                      {showDropdown && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                          {searchResults.map((patient) => (
                            <button
                              key={patient.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectPatient(patient);
                              }}
                            >
                              <span className="font-medium">
                                {patient.personalHistory?.fullName}
                              </span>
                              <span className="text-muted-foreground ms-2">
                                {patient.personalHistory?.phoneNumber}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("patientName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("enterPatientName")}
                      {...field}
                      className={cn(
                        selectedPatientId &&
                          "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20",
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("date")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full ps-3 text-start font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format.dateTime(field.value, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          ) : (
                            <span>{t("pickDate")}</span>
                          )}
                          <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        captionLayout="dropdown"
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 1}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notesOptional")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("notesPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("booking") : t("bookAppointment")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
