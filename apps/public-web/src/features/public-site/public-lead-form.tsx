"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";

type LeadValues = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  productKey: string;
  requirement: string;
  privacyConsent: boolean;
  contactConsent: boolean;
};

type LeadErrors = Partial<Record<keyof LeadValues, string>>;

const INITIAL_LEAD_VALUES: LeadValues = {
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  productKey: "",
  requirement: "",
  privacyConsent: false,
  contactConsent: false,
};

function validateLeadField(name: keyof LeadValues, values: LeadValues): string | undefined {
  const value = values[name];
  if (name === "companyName" && !String(value).trim()) return "请填写公司名称。";
  if (name === "contactName" && !String(value).trim()) return "请填写您的姓名。";
  if (name === "phone" && !/^1[3-9]\d{9}$/.test(String(value).replace(/\s/g, ""))) return "请填写正确的 11 位手机号。";
  if (name === "email" && String(value).trim() && !/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(String(value).trim())) return "请填写正确的邮箱地址。";
  if (name === "privacyConsent" && value !== true) return "提交前请同意隐私政策。";
  if (name === "contactConsent" && value !== true) return "提交前请同意云璨信息通过电话或邮件联系您。";
  return undefined;
}

interface PublicLeadFormProps {
  source: string;
  productOptions?: ContactProductOption[];
  initialProductKey?: string;
  submitLabel?: string;
  successDescription?: string;
  className?: string;
}

export interface ContactProductOption {
  name: string;
  productKey: string;
}

export default function PublicLeadForm({
  source,
  productOptions = [],
  initialProductKey = "",
  submitLabel = "提交申请",
  successDescription = "云璨信息将在 1 个工作日内与您联系。",
  className = "",
}: PublicLeadFormProps) {
  const [values, setValues] = useState<LeadValues>(() => ({
    ...INITIAL_LEAD_VALUES,
    // 仅接受后台返回的产品参数，避免 URL 传入无效值后直接提交。
    productKey: productOptions.some((option) => option.productKey === initialProductKey)
      ? initialProductKey
      : "",
  }));
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const updateValue = <K extends keyof LeadValues>(name: K, value: LeadValues[K]) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validateOne = (name: keyof LeadValues) => {
    const message = validateLeadField(name, values);
    setErrors((current) => ({ ...current, [name]: message }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = (Object.keys(values) as Array<keyof LeadValues>).reduce<LeadErrors>((result, name) => {
      const message = validateLeadField(name, values);
      if (message) result[name] = message;
      return result;
    }, {});
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/contact-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: values.companyName,
          contact_name: values.contactName,
          phone: values.phone.replace(/\s/g, ""),
          email: values.email,
          product_key: values.productKey,
          requirement: values.requirement,
          privacy_consent: values.privacyConsent,
          contact_consent: values.contactConsent,
          source,
          referrer: window.location.href,
          website,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = body?.error?.details;
        if (details && typeof details === "object") {
          const fieldMap: Record<string, keyof LeadValues> = {
            company_name: "companyName",
            contact_name: "contactName",
            phone: "phone",
            email: "email",
            product_key: "productKey",
            privacy_consent: "privacyConsent",
            contact_consent: "contactConsent",
          };
          const serverErrors = Object.entries(details).reduce<LeadErrors>((result, [key, value]) => {
            const field = fieldMap[key];
            if (field) result[field] = Array.isArray(value) ? String(value[0]) : String(value);
            return result;
          }, {});
          if (Object.keys(serverErrors).length > 0) setErrors(serverErrors);
        }
        throw new Error(body?.error?.message || "提交失败，请稍后重试。");
      }
      setSubmitted(true);
      setValues(INITIAL_LEAD_VALUES);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
        <CheckCircle2 className="text-hermes" size={44} aria-hidden="true" />
        <h2 className="mt-5 text-2xl font-black text-charcoal">提交成功</h2>
        <p className="mt-3 max-w-lg leading-7 text-muted">{successDescription}</p>
      </div>
    );
  }

  const fieldClass = "mt-2 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-hermes";
  return (
    <form className={`px-7 py-8 md:px-10 md:py-10 ${className}`} noValidate onSubmit={submit}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-bold text-charcoal">公司名称 <span className="text-hermes">*</span><input aria-invalid={Boolean(errors.companyName)} className={fieldClass} maxLength={60} onBlur={() => validateOne("companyName")} onChange={(event) => updateValue("companyName", event.target.value)} value={values.companyName} />{errors.companyName ? <span className="mt-1 block text-sm text-red-700">{errors.companyName}</span> : null}</label>
        <label className="block text-sm font-bold text-charcoal">您的姓名 <span className="text-hermes">*</span><input aria-invalid={Boolean(errors.contactName)} className={fieldClass} maxLength={20} onBlur={() => validateOne("contactName")} onChange={(event) => updateValue("contactName", event.target.value)} value={values.contactName} />{errors.contactName ? <span className="mt-1 block text-sm text-red-700">{errors.contactName}</span> : null}</label>
        <label className="block text-sm font-bold text-charcoal">手机号码 <span className="text-hermes">*</span><input aria-invalid={Boolean(errors.phone)} className={fieldClass} inputMode="numeric" maxLength={11} onBlur={() => validateOne("phone")} onChange={(event) => updateValue("phone", event.target.value)} placeholder="用于联系您" type="tel" value={values.phone} />{errors.phone ? <span className="mt-1 block text-sm text-red-700">{errors.phone}</span> : null}</label>
        <label className="block text-sm font-bold text-charcoal">邮箱地址 <span className="font-normal text-muted">（选填）</span><input aria-invalid={Boolean(errors.email)} className={fieldClass} maxLength={254} onBlur={() => validateOne("email")} onChange={(event) => updateValue("email", event.target.value)} placeholder="方便接收方案资料" type="email" value={values.email} />{errors.email ? <span className="mt-1 block text-sm text-red-700">{errors.email}</span> : null}</label>
        {productOptions.length > 0 ? <label className="block text-sm font-bold text-charcoal">意向产品 <span className="font-normal text-muted">（选填）</span><select className={fieldClass} onChange={(event) => updateValue("productKey", event.target.value)} value={values.productKey}><option value="">请选择感兴趣的产品</option>{productOptions.map((option) => <option key={option.productKey} value={option.productKey}>{option.name}</option>)}</select></label> : null}
      </div>
      <label className="mt-5 block text-sm font-bold text-charcoal">咨询需求 <span className="font-normal text-muted">（选填）</span><textarea className={`${fieldClass} min-h-28 resize-y`} maxLength={1000} onChange={(event) => updateValue("requirement", event.target.value)} placeholder="可填写部署规模、现有环境或希望重点了解的能力" value={values.requirement} /></label>
      <input aria-hidden="true" autoComplete="off" className="hidden" onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} value={website} />
      <div className="mt-6 flex flex-col gap-4">
        <label className="flex items-start gap-2 text-sm leading-6 text-muted"><input checked={values.privacyConsent} className="mt-1 size-4 shrink-0 accent-hermes" onBlur={() => validateOne("privacyConsent")} onChange={(event) => updateValue("privacyConsent", event.target.checked)} type="checkbox" /><span>我已阅读并同意<a className="ml-1 font-bold text-hermes underline underline-offset-2" href="/legal/privacy-policy" target="_blank">《隐私政策》</a></span></label>
        <label className="flex items-start gap-2 text-sm leading-6 text-muted"><input checked={values.contactConsent} className="mt-1 size-4 shrink-0 accent-hermes" onBlur={() => validateOne("contactConsent")} onChange={(event) => updateValue("contactConsent", event.target.checked)} type="checkbox" /><span>同意云璨信息通过电话/邮件就本次咨询与我联系并回复方案</span></label>
        {errors.privacyConsent ? <p className="text-sm text-red-700">{errors.privacyConsent}</p> : null}
        {errors.contactConsent ? <p className="text-sm text-red-700">{errors.contactConsent}</p> : null}
        <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-hermes px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-hermes-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={submitting} type="submit">{submitting ? "提交中..." : submitLabel}</button>
      </div>
      {submitError ? <p className="mt-3 text-sm text-red-700" role="alert">{submitError}</p> : null}
    </form>
  );
}
