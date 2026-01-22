// Type declaration for dynamic inquirer import
declare function require(name: string): any;

export async function promptUser(questions: any[]): Promise<any> {
    // Use dynamic import for ESM inquirer in CJS project
    const { default: inquirer } = await import('inquirer');
    return (inquirer as any).prompt(questions);
}
