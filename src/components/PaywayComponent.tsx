'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import 'dotenv/config';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Cards from 'react-credit-cards-2';
import 'react-credit-cards-2/dist/es/styles-compiled.css';

interface PaywayWindow extends Window {
    Decidir?: any;
}

interface PaywayPaymentProps {
    userData: {
        ident: string;
        birthdate: string;
    };

	paywayData: {
		payway_public_key: string;
		payway_token_url: string;
	};
}

function JsonDisplay({ data, isError }: { data: any; isError: boolean }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className={`flex items-center text-sm ${isError ? 'text-red-600' : 'text-green-600'} hover:opacity-80`}>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {isOpen ? 'Hide Response' : 'Show Response'}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-md">
                    <pre className={`p-2 ${isError ? 'bg-red-50' : 'bg-green-50'} text-xs whitespace-pre-wrap`}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function PaywayPayment({ userData, paywayData }: PaywayPaymentProps) {
	const formRef = useRef<HTMLFormElement>(null);
    const decidirRef = useRef<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [apiResponse, setApiResponse] = useState<{ data: any; isError: boolean } | null>(null);
    const [formData, setFormData] = useState({
        cardholderName: '',
        identNumber: userData.ident,
        street: '',
        city: 'BA',
        state: 'BA',
        country: 'AR',
    });
    const [cardDisplay, setCardDisplay] = useState({
        number: '',
        name: '',
        expiry: '',
        cvc: '',
        focused: '',
    });
    const router = useRouter();

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://live.decidir.com/static/v2.5/decidir.js';
        script.async = true;

        script.onload = () => {
            const win = window as PaywayWindow;
            if (win.Decidir) {
                decidirRef.current = new win.Decidir(
                    paywayData.payway_token_url,
                    false,
                );
                decidirRef.current.setPublishableKey(
                    paywayData.payway_public_key,
                );
                setIsSDKLoaded(true);
            }
        };

        document.body.appendChild(script);
        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    const formatCardNumber = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        const parts = [];
        for (let i = 0; i < numbers.length; i += 4) {
            parts.push(numbers.slice(i, i + 4));
        }
        return parts.join(' ');
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name } = e.target;
        setCardDisplay((prev) => ({
            ...prev,
            focused:
                name === 'card_number'
                    ? 'number'
                    : name === 'cardholderName'
                        ? 'name'
                        : name === 'card_expiration_month' ||
                            name === 'card_expiration_year'
                            ? 'expiry'
                            : name === 'security_code'
                                ? 'cvc'
                                : '',
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        switch (name) {
            case 'card_number': {
                const numbers = value.replace(/\D/g, '').slice(0, 16);
                setCardDisplay((prev) => ({
                    ...prev,
                    number: formatCardNumber(numbers),
                }));
                break;
            }
            case 'cardholderName': {
                setFormData((prev) => ({
                    ...prev,
                    cardholderName: value,
                }));
                setCardDisplay((prev) => ({
                    ...prev,
                    name: value,
                }));
                break;
            }
            case 'card_expiration_month': {
                const month = value.replace(/\D/g, '').slice(0, 2);
                setCardDisplay((prev) => ({
                    ...prev,
                    expiry: `${month}${prev.expiry.slice(2)}`,
                }));
                break;
            }
            case 'card_expiration_year': {
                const year = value.replace(/\D/g, '').slice(0, 2);
                setCardDisplay((prev) => ({
                    ...prev,
                    expiry: `${cardDisplay.expiry.slice(0, 2)}${year}`,
                }));
                break;
            }
            case 'security_code': {
                setCardDisplay((prev) => ({
                    ...prev,
                    cvc: value.replace(/\D/g, '').slice(0, 4),
                }));
                break;
            }
            default: {
                if (name in formData) {
                    setFormData((prev) => ({
                        ...prev,
                        [name]: value,
                    }));
                }
                break;
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formRef.current || !isSDKLoaded || !decidirRef.current) return;

        setIsProcessing(true);
        setApiResponse(null);

        try {
            const birthdate = format(new Date(userData.birthdate), 'ddMMyyyy');

            const createHiddenInput = (name: string, value: string) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.setAttribute('data-decidir', name);
                input.value = value;
                return input;
            };

            const hiddenInputs = [
                createHiddenInput('card_holder_name', formData.cardholderName),
                createHiddenInput('card_holder_doc_type', 'dni'),
                createHiddenInput('card_holder_doc_number', formData.identNumber),
                createHiddenInput('card_holder_address', formData.street),
                createHiddenInput('card_holder_city', formData.city),
                createHiddenInput('card_holder_state', formData.state),
                createHiddenInput('card_holder_country', formData.country),
                createHiddenInput('card_holder_birthday', birthdate),
                createHiddenInput('device_unique_identifier', crypto.randomUUID()),
            ];

            hiddenInputs.forEach((input) => formRef.current?.appendChild(input));

            decidirRef.current.createToken(
                formRef.current,
                async (status: number, response: any) => {
                    try {
                        hiddenInputs.forEach((input) => input.remove());

                        if (status !== 200 && status !== 201) {
                            throw new Error(response.error?.message || 'Error processing payment');
                        }

                        const apiResponse = await fetch('/api/checkout', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                data: {
                                    ...response,
                                    address: {
                                        street: formData.street,
                                        city: formData.city,
                                        state: formData.state,
                                        country: formData.country,
                                    },
                                },
                            }),
                        });

                        const responseData = await apiResponse.json();
                        const isError = !apiResponse.ok;

                        setApiResponse({ data: responseData, isError });
                    } catch (error) {
                        console.error('Error processing payment:', error);
                        setApiResponse({
                            data: { error: error instanceof Error ? error.message : 'Unknown error occurred' },
                            isError: true
                        });
                    } finally {
                        setIsProcessing(false);
                    }
                },
            );
        } catch (error) {
            console.error('Error in form submission:', error);
            setApiResponse({
                data: { error: error instanceof Error ? error.message : 'Unknown error occurred' },
                isError: true
            });
            setIsProcessing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Card Details</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid lg:grid-cols-2 gap-8">
                    <div className="order-2 lg:order-1">
                        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Payment Information</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="card_number">Card Number</Label>
                                    <Input
                                        id="card_number"
                                        name="card_number"
                                        data-decidir="card_number"
                                        onChange={handleInputChange}
                                        onFocus={handleInputFocus}
                                        placeholder="1234 5678 9012 3456"
                                        autoComplete="cc-number"
                                        maxLength={19}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                                    <Input
                                        id="cardholderName"
                                        name="cardholderName"
                                        value={formData.cardholderName}
                                        onChange={handleInputChange}
                                        onFocus={handleInputFocus}
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="card_expiration_month">Month</Label>
                                            <Input
                                                id="card_expiration_month"
                                                name="card_expiration_month"
                                                data-decidir="card_expiration_month"
                                                onChange={handleInputChange}
                                                onFocus={handleInputFocus}
                                                placeholder="MM"
                                                maxLength={2}
                                                autoComplete="cc-exp-month"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="card_expiration_year">Year</Label>
                                            <Input
                                                id="card_expiration_year"
                                                name="card_expiration_year"
                                                data-decidir="card_expiration_year"
                                                onChange={handleInputChange}
                                                onFocus={handleInputFocus}
                                                placeholder="YY"
                                                maxLength={2}
                                                autoComplete="cc-exp-year"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="security_code">Security Code</Label>
                                        <Input
                                            id="security_code"
                                            name="security_code"
                                            data-decidir="security_code"
                                            onChange={handleInputChange}
                                            onFocus={handleInputFocus}
                                            placeholder="123"
                                            maxLength={4}
                                            autoComplete="cc-csc"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Billing Information</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="identNumber">Identification Number</Label>
                                    <Input
                                        id="identNumber"
                                        name="identNumber"
                                        value={formData.identNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter identification number"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="street">Street Address</Label>
                                    <Input
                                        id="street"
                                        name="street"
                                        value={formData.street}
                                        onChange={handleInputChange}
                                        placeholder="Enter street address"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <select
                                            id="city"
                                            name="city"
                                            value={formData.city}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    city: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        >
                                            <option value="BsAs">BsAs</option>
                                            <option value="Cordoba">Córdoba</option>
                                            <option value="Rosario">Rosario</option>
                                            <option value="Mendoza">Mendoza</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <select
                                            id="state"
                                            name="state"
                                            value={formData.state}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    state: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        >
                                            <option value="BsAs">BsAs</option>
                                            <option value="Cordoba">Córdoba</option>
                                            <option value="SantaFe">Santa Fe</option>
                                            <option value="Mendoza">Mendoza</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <select
                                            id="country"
                                            name="country"
                                            value={formData.country}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    country: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        >
                                            <option value="Argentina">Argentina</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isProcessing || !isSDKLoaded}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Pay Now'
                                )}
                            </Button>

                            {apiResponse && (
                                <div className="mt-4">
                                    <JsonDisplay
                                        data={apiResponse.data}
                                        isError={apiResponse.isError}
                                    />
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="order-1 lg:order-2">
                        <div className="sticky top-4">
                            <Cards
                                number={cardDisplay.number}
                                expiry={cardDisplay.expiry}
                                cvc={cardDisplay.cvc}
                                name={cardDisplay.name}
                                focused={cardDisplay.focused as any}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
