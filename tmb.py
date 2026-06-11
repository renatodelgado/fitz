def calcular_tmb(sexo,peso,altura,idade):
    if sexo == 'M':
        tmb =  (10 * peso + 6.25 * altura - 5 * idade) + 5
        return tmb
    elif sexo == 'F':
        tmb =  (10 * peso + 6.25 * altura - 5 * idade) - 161
        return tmb

condicoes = True

qtd_exercicio = list(range(6))

while condicoes:
    sexo = 0
    sexo_possivel = ['M', 'F']
    while sexo not in sexo_possivel:
        sexo = input('Digite o sexo da pessoa (M/F): ').upper()
        if sexo not in sexo_possivel:
            print('Valor digitado não foi reconhecido como um sexo M/F.')
    peso = 'a'
    while not isinstance(peso, (float, int)):
        peso = input('Digite o peso dessa pessoa (em kg): ')
        try:
            peso = float(peso)
        except:
            print('Valor digitado não foi reconhecido como um número.')
    altura = 'a'
    while not isinstance(altura, (float, int)):
        altura = input('Digite a altura dessa pessoa (em cm): ')
        try:
            altura = float(altura)
        except:
            print('Valor digitado não foi reconhecido como um número.')
    idade = 'a'
    while not isinstance(idade, (int)):
        idade = input('Digite a idade dessa pessoa: ')
        try:
            idade = int(idade)
        except:
            print('Valor digitado não foi reconhecido como um número inteiro.')
    condicoes = False

exercicio = -1

msg_exercicio = ['Sedentário: pratica pouco ou nenhum exercício físico.',
'Pratica exercícios de 1 a 3 vezes na semana.',
'Pratica exercícios de 4 a 5 vezes na semana.',
'Pratica exercícios diariamente ou pratica exercícios intenso de 3 a 4 vezes na semana.',
'Pratica exercícios intensos de 6 a 7 vezes na semana.',
'Pratica exercícios muito intensos diariamente']

print('Taxa Metabólica Basal: ', calcular_tmb(sexo,peso,altura,idade), 'calorias/dia')

fator_exercicico = {0: 1.2001177163, 1: 1.37492642731, 2: 1.46497939965, 3: 1.54973513832, 4: 1.72454384932, 5: 1.89994114185}

for i, msg in enumerate(msg_exercicio):
    tmb_exercicio = fator_exercicico[i]*calcular_tmb(sexo,peso,altura,idade)
    print(f'[{i}] {tmb_exercicio:.2f} | {msg}')

while exercicio not in qtd_exercicio:
    exercicio = input('Qual é a quantidade de exercícios dessa pessoa? ')
    try:
        exercicio = int(exercicio)
    except:
        print('Você não digitou um número.')
    if exercicio not in qtd_exercicio:
        print('Número digitado incorretamente.')

deficit_calorico = ''
while not isinstance(deficit_calorico, (float,int)):
    deficit_calorico = input('Digite o déficit calórico desejado: ')
    try:
        deficit_calorico = abs(float(deficit_calorico))
    except:
        print('É necessário digitar um número.')

qtd_calorias_total = fator_exercicico[exercicio]*calcular_tmb(sexo,peso,altura,idade) - deficit_calorico



print('Pesos ideais para esta pessoa: ')

altura = altura/100
lista_imcs_ideais = [18.5, 20.1, 21.7, 23.3, 24.9]

for i, imc in enumerate(lista_imcs_ideais):
    peso_ideal = imc * altura ** 2
    print(f'[{i}] {peso_ideal:.1f}')

qtd_escolha_peso = list(range(5))

escolha_peso = ''

while escolha_peso not in qtd_escolha_peso:
    escolha_peso = input('Qual é o peso escolhido? ')
    try:
        escolha_peso = int(escolha_peso)
    except:
        print('Você não digitou um número.')
    if exercicio not in qtd_exercicio:
        print('Número digitado incorretamente.')

peso_ideal = lista_imcs_ideais[escolha_peso] * altura ** 2

if sexo == "M":
    proteina_ideal = peso_ideal * 2
else:
    proteina_ideal = peso_ideal * 1.6

gordura_ideal = peso_ideal

cal_proteina = proteina_ideal * 4
cal_gordura = gordura_ideal * 9
cal_carbs = qtd_calorias_total - cal_proteina - cal_gordura

carbs_ideal = cal_carbs/4

carbs_porcentagem = cal_carbs / qtd_calorias_total * 100
gordura_porcentagem = cal_gordura / qtd_calorias_total * 100
proteina_porcentagem = cal_proteina / qtd_calorias_total * 100

print(f'''Consumo de calorias: {qtd_calorias_total}
Quantidade de carboidratos: {carbs_ideal:.2f} g ({cal_carbs:.2f} cal) | {carbs_porcentagem:.1f}%
Quantidade de proteínas: {proteina_ideal:.2f} g ({cal_proteina:.2f} cal) | {proteina_porcentagem:.1f}%
Quantidade de gorduras: {gordura_ideal:.2f} g ({cal_gordura:.2f} cal) | {gordura_porcentagem:.1f}%''')