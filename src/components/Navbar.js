export default function Navbar() {
  return (
    <nav className="w-full py-4 px-8 flex justify-between items-center bg-white border-b">
      <div className="text-2xl font-black text-green-600">GNIS</div>
      <div className="flex gap-6 font-medium text-gray-600">
        <a href="#" className="hover:text-green-600">The Wizard</a>
        <a href="#" className="hover:text-green-600">Templates</a>
        <button className="bg-green-600 text-white px-5 py-2 rounded-full text-sm">
          Login
        </button>
      </div>
    </nav>
  );
}