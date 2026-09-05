import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

function isValidCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, '');

  if (cpf.length !== 11) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split('').map(Number);

  const calcCheckDigit = (length: number): number => {
    let sum = 0;

    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }

    const remainder = (sum * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  return (
    calcCheckDigit(9) === digits[9] &&
    calcCheckDigit(10) === digits[10]
  );
}

export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidCpf(value);
        },
        defaultMessage() {
          return 'CPF inválido.';
        },
      },
    });
  };
}
