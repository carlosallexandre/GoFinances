const formatValue = (value: number): string =>
  value.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });

export default formatValue;
