import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function WhoUsesThis() {
  const users = [
    {
      name: "Sarah Chen",
      role: "Finance Student",
      avatar: "/finance-student.png",
      initial: "SC",
    },
    {
      name: "Mike Rodriguez",
      role: "Junior Analyst",
      avatar: "/financial-analyst.png",
      initial: "MR",
    },
    {
      name: "Emma Thompson",
      role: "Retail Investor",
      avatar: "/retail-investor.png",
      initial: "ET",
    },
    {
      name: "David Kim",
      role: "Research Assistant",
      avatar: "/research-assistant.png",
      initial: "DK",
    },
  ]

  const institutions = [
    { name: "Universities", color: "bg-primary/20 text-primary" },
    { name: "Investment Clubs", color: "bg-success/20 text-success" },
    { name: "Research Groups", color: "bg-danger/20 text-danger" },
    { name: "Trading Communities", color: "bg-primary/20 text-primary" },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white font-poppins mb-4">Who Uses This</h2>
        <p className="text-xl text-muted max-w-3xl mx-auto">
          Students, early-career analysts, and retail investors use this to explore data and view AI predictions.
        </p>
      </div>

      <Card className="bg-card border-grid">
        <CardContent className="p-8">
          {/* User Avatars */}
          <div className="flex justify-center items-center space-x-6 mb-8">
            {users.map((user, index) => (
              <div key={index} className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-2 border-2 border-primary/20">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{user.initial}</AvatarFallback>
                </Avatar>
                <p className="text-sm text-white font-medium">{user.name}</p>
                <p className="text-xs text-muted">{user.role}</p>
              </div>
            ))}
          </div>

          {/* Institution Badges */}
          <div className="flex flex-wrap justify-center gap-3">
            {institutions.map((institution, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={`${institution.color} border-0 px-4 py-2 text-sm font-medium`}
              >
                {institution.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
