const payway_private_key = process.env.PAYWAY_PRIVATE_KEY;

export async function POST(request: Request) {
    if (!payway_private_key) {
        return new Response(null, { status: 400 });
    }

	try {
		const requestData = await request.json();

		const paymentRequest = {
			customer: {
				id: generateRandomValue(6),
				email: 'example@email.com',
				ip_address: '245.120.47.151',
			},
			site_transaction_id: generateRandomValue(6),
			token: requestData.data.id,
			establishment_name: 'Merchant.com',
			payment_method_id: 1,
			bin: requestData.data.bin,
			amount: 20000,
			currency: 'ARS',
			installments: 1,
			payment_type: 'single',
			sub_payments: [],
			fraud_detection: {
				send_to_cs: true,
				channel: 'Web',
				bill_to: {
					city: 'Buenos Aires',
					country: 'AR',
					customer_id: 'matiasdc',
					email: 'mail@gmail.com',
					first_name: 'Matias',
					last_name: 'De Carli',
					phone_number: '1152767432',
					postal_code: '1427',
					state: 'BA',
					street1: 'GARCIA DEL RIO 4041',
				},
				purchase_totals: {
					currency: 'ARS',
					amount: 20000,
				},
				customer_in_site: {
					days_in_site: 22,
					is_guest: false,
					password: 'what-is-this',
					num_of_transactions: 1,
					cellphone_number: '12121',
					date_of_birth: '129412',
					street: 'RIO 4041',
				},
				retail_transaction_data: {
					ship_to: {
						city: requestData.data.address?.city || 'BA',
						country: requestData.data.address?.country || 'AR',
						email: 'mail@gmail.com',
						first_name: 'Matias',
						last_name: 'De Carli',
						phone_number: '',
						postal_code: '1427',
						state: requestData.data.address?.state || 'BA',
						street1: requestData.data.address?.street || 'GARCIA DEL RIO 4041',
					},
					days_to_delivery: '55',
					dispatch_method: '',
					tax_voucher_required: true,
					customer_loyality_number: '',
					coupon_code: '',
					items: [
						{
							code: 'ticket_id',
							description: 'Entradas Merchant.com',
							name: 'MERCHANT.COM',
							sku: 'no_sku',
							total_amount: 20000,
							quantity: 2,
							unit_price: 10000,
						},
					],
				},
			},
		};
		const response = await fetch(
			'https://developers-ventasonline.payway.com.ar/api/v2/payments',
			{
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					apikey: payway_private_key,
				},
				body: JSON.stringify(paymentRequest),
			},
		);

		const dataPrismaReq = await response.json();

		console.log('transaction response', dataPrismaReq);
		if (dataPrismaReq.status_details)
			console.log(
				'transaction error',
				dataPrismaReq.status_details.error,
			);

        if (dataPrismaReq.status === 'approved') {
            return new Response(
                JSON.stringify(dataPrismaReq),
                { status: 200 },
            );
        }
        else {
            return new Response(
                JSON.stringify(dataPrismaReq),
                { status: 400 },
            );
        }

	} catch (error) {
		console.error(error);
		return new Response(null, { status: 500 });
	}
}

function generateRandomValue(length: number) {
    const randomChars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}
